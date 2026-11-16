import 'server-only'

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

import { consumeChatRateLimit } from '@/lib/contact-rate-limit'
import {
  ACCESS_CODE_ALPHABET,
  RUBRIC_KEYS,
  type JudgeState,
  type JudgingAdminEvent,
  type JudgingAdminScore,
  type JudgingAdminSnapshot,
  type JudgingContestant,
  type JudgingEventDetail,
  type JudgingScore,
  type RubricScores,
} from '@/lib/judging-contracts'
import { getRequestIdentity } from '@/lib/request-identity'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

export const JUDGE_COOKIE = 'pot_judge'
const JUDGE_COOKIE_PATH = '/api/judging'
const JUDGE_COOKIE_MAX_AGE = 12 * 60 * 60
const JUDGE_COOKIE_DOMAIN = 'pillars-of-tech:judge-session:v1\u0000'

export class JudgingUnavailableError extends Error {
  constructor() {
    super('Judging is temporarily unavailable.')
    this.name = 'JudgingUnavailableError'
  }
}

export class JudgingNotFoundError extends Error {
  constructor(message = 'That item is no longer available.') {
    super(message)
    this.name = 'JudgingNotFoundError'
  }
}

export class JudgingConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JudgingConflictError'
  }
}

// ---------------------------------------------------------------------------
// Judge session cookie
// ---------------------------------------------------------------------------

function sign(judgeId: string): string {
  const pepper = process.env.CHAT_TOKEN_PEPPER?.trim()
  if (!pepper) throw new JudgingUnavailableError()
  return createHmac('sha256', pepper).update(JUDGE_COOKIE_DOMAIN, 'utf8').update(judgeId, 'utf8').digest('base64url')
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Return the signed-in judge's id from the cookie, or null if absent/forged. */
export function getJudgeIdFromRequest(request: Request): string | null {
  const cookies = (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim())
  const matches = cookies.filter((part) => part.startsWith(`${JUDGE_COOKIE}=`))
  if (matches.length !== 1) return null
  const [judgeId, signature] = matches[0].slice(JUDGE_COOKIE.length + 1).split('.')
  if (!judgeId || !signature || !uuidPattern.test(judgeId)) return null
  try {
    const expected = Buffer.from(sign(judgeId))
    const given = Buffer.from(signature)
    return expected.length === given.length && timingSafeEqual(expected, given) ? judgeId : null
  } catch {
    return null
  }
}

function cookieHeader(value: string, maxAge: number): string {
  return [`${JUDGE_COOKIE}=${value}`, `Max-Age=${maxAge}`, `Path=${JUDGE_COOKIE_PATH}`, 'HttpOnly', 'Secure', 'SameSite=Lax'].join('; ')
}

export function setJudgeCookie(response: Response, judgeId: string): void {
  response.headers.append('Set-Cookie', cookieHeader(`${judgeId}.${sign(judgeId)}`, JUDGE_COOKIE_MAX_AGE))
}

export function clearJudgeCookie(response: Response): void {
  response.headers.append('Set-Cookie', cookieHeader('', 0))
}

/** A whole judging panel shares venue Wi-Fi; this only slows code guessing. */
export async function allowJudgeLoginAttempt(request: Request): Promise<boolean> {
  return consumeChatRateLimit('judging-login', getRequestIdentity(request), { windowSeconds: 60, maxAttempts: 30 })
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

type EventRow = {
  id: string
  title: string
  is_current: boolean
  scores_locked: boolean
  current_contestant_id: string | null
  created_at: string
}

type AdminEventRow = EventRow & {
  judging_contestants: Array<{ count: number }> | null
  judging_judges: Array<{ count: number }> | null
}

type ContestantRow = { id: string; name: string; project: string }
type JudgeRow = { id: string; event_id: string; name: string; access_code: string }
type ScoreRow = RubricScores & { judge_id: string; contestant_id: string; comment: string; updated_at: string }

const EVENT_COLUMNS = 'id, title, is_current, scores_locked, current_contestant_id, created_at'
const ADMIN_EVENT_COLUMNS = `${EVENT_COLUMNS}, judging_contestants(count), judging_judges(count)`
const SCORE_COLUMNS = `judge_id, contestant_id, ${RUBRIC_KEYS.join(', ')}, comment, updated_at`

function client() {
  try {
    return createSupabaseServiceRoleClient()
  } catch {
    throw new JudgingUnavailableError()
  }
}

function toAdminEvent(row: AdminEventRow): JudgingAdminEvent {
  return {
    id: row.id,
    title: row.title,
    isCurrent: row.is_current,
    scoresLocked: row.scores_locked,
    currentContestantId: row.current_contestant_id,
    createdAt: row.created_at,
    contestantCount: row.judging_contestants?.[0]?.count ?? 0,
    judgeCount: row.judging_judges?.[0]?.count ?? 0,
  }
}

function toScore(row: ScoreRow): JudgingScore {
  return {
    contestantId: row.contestant_id,
    problem: row.problem,
    creativity: row.creativity,
    stem: row.stem,
    design: row.design,
    pitch: row.pitch,
    comment: row.comment,
    updatedAt: row.updated_at,
  }
}

async function listContestants(eventId: string): Promise<JudgingContestant[]> {
  const { data, error } = await client()
    .from('judging_contestants')
    .select('id, name, project')
    .eq('event_id', eventId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<ContestantRow[]>()
  if (error) throw new JudgingUnavailableError()
  return data ?? []
}

/** The judge and their event, only while that event is the open one. */
async function getActiveJudge(judgeId: string): Promise<{ judge: JudgeRow; event: EventRow } | null> {
  const supabase = client()
  const { data: judge, error } = await supabase.from('judging_judges').select('id, event_id, name, access_code').eq('id', judgeId).maybeSingle<JudgeRow>()
  if (error) throw new JudgingUnavailableError()
  if (!judge) return null
  const { data: event, error: eventError } = await supabase.from('judging_events').select(EVENT_COLUMNS).eq('id', judge.event_id).maybeSingle<EventRow>()
  if (eventError) throw new JudgingUnavailableError()
  if (!event || !event.is_current) return null
  return { judge, event }
}

// ---------------------------------------------------------------------------
// Judges
// ---------------------------------------------------------------------------

export async function signInJudge(code: string): Promise<{ judgeId: string } | null> {
  const { data, error } = await client().from('judging_judges').select('id').eq('access_code', code).maybeSingle<{ id: string }>()
  if (error) throw new JudgingUnavailableError()
  if (!data) return null
  return (await getActiveJudge(data.id)) ? { judgeId: data.id } : null
}

export async function getJudgeState(judgeId: string): Promise<JudgeState | null> {
  const active = await getActiveJudge(judgeId)
  if (!active) return null
  const [contestants, scores] = await Promise.all([
    listContestants(active.event.id),
    client()
      .from('judging_scores')
      .select(SCORE_COLUMNS)
      .eq('judge_id', judgeId)
      .returns<ScoreRow[]>(),
  ])
  if (scores.error) throw new JudgingUnavailableError()
  return {
    judge: { id: active.judge.id, name: active.judge.name },
    event: { id: active.event.id, title: active.event.title, scoresLocked: active.event.scores_locked },
    currentContestantId: active.event.current_contestant_id,
    contestants,
    scores: (scores.data ?? []).map(toScore),
  }
}

export async function saveJudgeScore(
  judgeId: string,
  input: RubricScores & { contestantId: string; comment: string },
): Promise<JudgingScore | 'signed_out' | 'locked'> {
  const active = await getActiveJudge(judgeId)
  if (!active) return 'signed_out'
  if (active.event.scores_locked) return 'locked'

  const supabase = client()
  const { data: contestant, error } = await supabase
    .from('judging_contestants')
    .select('id')
    .eq('id', input.contestantId)
    .eq('event_id', active.event.id)
    .maybeSingle()
  if (error) throw new JudgingUnavailableError()
  if (!contestant) throw new JudgingNotFoundError('That student was removed from the event.')

  const { data, error: saveError } = await supabase
    .from('judging_scores')
    .upsert(
      {
        event_id: active.event.id,
        contestant_id: input.contestantId,
        judge_id: judgeId,
        problem: input.problem,
        creativity: input.creativity,
        stem: input.stem,
        design: input.design,
        pitch: input.pitch,
        comment: input.comment,
      },
      { onConflict: 'judge_id,contestant_id' },
    )
    .select(SCORE_COLUMNS)
    .single<ScoreRow>()
  if (saveError || !data) throw new JudgingUnavailableError()
  return toScore(data)
}

// ---------------------------------------------------------------------------
// Host controls (callers must already have verified staff access)
// ---------------------------------------------------------------------------

export async function getJudgingSnapshot(): Promise<JudgingAdminSnapshot> {
  const { data, error } = await client()
    .from('judging_events')
    .select(ADMIN_EVENT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<AdminEventRow[]>()
  if (error) throw new JudgingUnavailableError()
  const events = (data ?? []).map(toAdminEvent)
  return { events, currentEventId: events.find((event) => event.isCurrent)?.id ?? null }
}

export async function getJudgingEventDetail(eventId: string): Promise<JudgingEventDetail> {
  const supabase = client()
  const { data: event, error } = await supabase.from('judging_events').select(ADMIN_EVENT_COLUMNS).eq('id', eventId).maybeSingle<AdminEventRow>()
  if (error) throw new JudgingUnavailableError()
  if (!event) throw new JudgingNotFoundError()

  const [contestants, judges, scores] = await Promise.all([
    listContestants(eventId),
    supabase.from('judging_judges').select('id, event_id, name, access_code').eq('event_id', eventId).order('created_at', { ascending: true }).returns<JudgeRow[]>(),
    supabase.from('judging_scores').select(SCORE_COLUMNS).eq('event_id', eventId).returns<ScoreRow[]>(),
  ])
  if (judges.error || scores.error) throw new JudgingUnavailableError()

  return {
    event: toAdminEvent(event),
    contestants,
    judges: (judges.data ?? []).map((judge) => ({ id: judge.id, name: judge.name, accessCode: judge.access_code })),
    scores: (scores.data ?? []).map((row): JudgingAdminScore => ({ ...toScore(row), judgeId: row.judge_id })),
  }
}

async function setCurrentEvent(eventId: string | null): Promise<void> {
  const { error } = await client().rpc('judging_set_current_event', { p_event_id: eventId })
  if (error?.code === 'P0002') throw new JudgingNotFoundError()
  if (error) throw new JudgingUnavailableError()
}

export async function createJudgingEvent(input: { title: string; createdBy: string }): Promise<string> {
  const { data, error } = await client().from('judging_events').insert({ title: input.title, created_by: input.createdBy }).select('id').single<{ id: string }>()
  if (error || !data) throw new JudgingUnavailableError()
  await setCurrentEvent(data.id)
  return data.id
}

export async function updateJudgingEvent(input: {
  eventId: string
  title?: string
  isCurrent?: boolean
  scoresLocked?: boolean
  currentContestantId?: string | null
}): Promise<void> {
  const supabase = client()
  if (input.currentContestantId) {
    const { data, error } = await supabase.from('judging_contestants').select('id').eq('id', input.currentContestantId).eq('event_id', input.eventId).maybeSingle()
    if (error) throw new JudgingUnavailableError()
    if (!data) throw new JudgingNotFoundError('That student is not part of this event.')
  }

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.scoresLocked !== undefined) patch.scores_locked = input.scoresLocked
  if (input.currentContestantId !== undefined) patch.current_contestant_id = input.currentContestantId

  if (Object.keys(patch).length > 0) {
    const { data, error } = await supabase.from('judging_events').update(patch).eq('id', input.eventId).select('id')
    if (error) throw new JudgingUnavailableError()
    if (!data?.length) throw new JudgingNotFoundError()
  }

  if (input.isCurrent === true) await setCurrentEvent(input.eventId)
  if (input.isCurrent === false) {
    const { error } = await supabase.from('judging_events').update({ is_current: false }).eq('id', input.eventId)
    if (error) throw new JudgingUnavailableError()
  }
}

/** Permanently remove an ended event with its students, judges, and scores. */
export async function deleteJudgingEvent(eventId: string): Promise<void> {
  const supabase = client()
  const { data, error } = await supabase.from('judging_events').select('is_current').eq('id', eventId).maybeSingle<{ is_current: boolean }>()
  if (error) throw new JudgingUnavailableError()
  if (!data) throw new JudgingNotFoundError()
  if (data.is_current) throw new JudgingConflictError('End the event before deleting it.')
  const { error: deleteError } = await supabase.from('judging_events').delete().eq('id', eventId).eq('is_current', false)
  if (deleteError) throw new JudgingUnavailableError()
}

export async function addContestants(eventId: string, entries: Array<{ name: string; project: string }>): Promise<void> {
  const supabase = client()
  const { data: last, error } = await supabase
    .from('judging_contestants')
    .select('position')
    .eq('event_id', eventId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>()
  if (error) throw new JudgingUnavailableError()
  const start = (last?.position ?? -1) + 1
  const { error: insertError } = await supabase
    .from('judging_contestants')
    .insert(entries.map((entry, index) => ({ event_id: eventId, name: entry.name, project: entry.project, position: start + index })))
  if (insertError?.code === '23503') throw new JudgingNotFoundError()
  if (insertError) throw new JudgingUnavailableError()
}

export async function removeContestant(contestantId: string): Promise<void> {
  const { data, error } = await client().from('judging_contestants').delete().eq('id', contestantId).select('id')
  if (error) throw new JudgingUnavailableError()
  if (!data?.length) throw new JudgingNotFoundError()
}

function generateAccessCode(): string {
  return Array.from({ length: 6 }, () => ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)]).join('')
}

export async function addJudge(eventId: string, name: string): Promise<{ id: string; accessCode: string }> {
  const supabase = client()
  // Codes are random; retry the rare collision with an existing code.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const accessCode = generateAccessCode()
    const { data, error } = await supabase.from('judging_judges').insert({ event_id: eventId, name, access_code: accessCode }).select('id').single<{ id: string }>()
    if (!error && data) return { id: data.id, accessCode }
    if (error?.code === '23503') throw new JudgingNotFoundError()
    if (error?.code !== '23505') throw new JudgingUnavailableError()
  }
  throw new JudgingUnavailableError()
}

export async function removeJudge(judgeId: string): Promise<void> {
  const { data, error } = await client().from('judging_judges').delete().eq('id', judgeId).select('id')
  if (error) throw new JudgingUnavailableError()
  if (!data?.length) throw new JudgingNotFoundError()
}
