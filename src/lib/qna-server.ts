import 'server-only'

import { createHmac } from 'node:crypto'

import { consumeChatRateLimit } from '@/lib/contact-rate-limit'
import {
  isValidQnaVisitorToken,
  QNA_VISITOR_HEADER,
  type QnaAdminQuestion,
  type QnaAdminSession,
  type QnaAdminSnapshot,
  type QnaPublicQuestion,
  type QnaPublicSnapshot,
  type QnaQuestionStatus,
} from '@/lib/qna-contracts'
import { getRequestIdentity } from '@/lib/request-identity'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

const QNA_VISITOR_DOMAIN = 'pillars-of-tech:qna-visitor:v1\u0000'

export class QnaUnavailableError extends Error {
  constructor() {
    super('Q&A is temporarily unavailable.')
    this.name = 'QnaUnavailableError'
  }
}

export class QnaNotFoundError extends Error {
  constructor() {
    super('That Q&A item is no longer available.')
    this.name = 'QnaNotFoundError'
  }
}

export class QnaConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QnaConflictError'
  }
}

/** Store only a keyed digest of the device token, never the token itself. */
export function hashQnaVisitorToken(token: string): string {
  const pepper = process.env.CHAT_TOKEN_PEPPER?.trim()
  if (!pepper || !isValidQnaVisitorToken(token)) throw new QnaUnavailableError()
  return createHmac('sha256', pepper).update(QNA_VISITOR_DOMAIN, 'utf8').update(token, 'utf8').digest('hex')
}

export function getQnaVisitorToken(request: Request): string | null {
  const value = request.headers.get(QNA_VISITOR_HEADER)
  return isValidQnaVisitorToken(value) ? value : null
}

// Everyone at a venue usually shares one Wi-Fi address, so the per-network
// bucket is deliberately generous; the per-device bucket does the real work.
const limits = {
  question: { device: { windowSeconds: 5 * 60, maxAttempts: 6 }, network: { windowSeconds: 60, maxAttempts: 100 } },
  vote: { device: { windowSeconds: 60, maxAttempts: 60 }, network: { windowSeconds: 10, maxAttempts: 100 } },
} as const

export async function allowQnaAction(kind: keyof typeof limits, request: Request, visitorToken: string): Promise<boolean> {
  const scope = `qna-${kind}`
  const [device, network] = await Promise.all([
    consumeChatRateLimit(`${scope}-device`, visitorToken, limits[kind].device),
    consumeChatRateLimit(`${scope}-network`, getRequestIdentity(request), limits[kind].network),
  ])
  return device && network
}

type SessionRow = {
  id: string
  title: string
  is_current: boolean
  accepting_questions: boolean
  highlighted_question_id: string | null
  created_at: string
}

type AdminSessionRow = SessionRow & { qna_questions: Array<{ count: number }> | null }

type QuestionRow = {
  id: string
  body: string
  author_name: string | null
  status: QnaQuestionStatus
  upvote_count: number
  created_at: string
}

const SESSION_COLUMNS = 'id, title, is_current, accepting_questions, highlighted_question_id, created_at'
const ADMIN_SESSION_COLUMNS = `${SESSION_COLUMNS}, qna_questions(count)`
const QUESTION_COLUMNS = 'id, body, author_name, status, upvote_count, created_at'
const MAX_QUESTIONS = 500

function toPublicQuestion(row: QuestionRow): QnaPublicQuestion {
  return {
    id: row.id,
    body: row.body,
    authorName: row.author_name,
    upvotes: row.upvote_count,
    answered: row.status === 'answered',
    createdAt: row.created_at,
  }
}

function toAdminSession(row: AdminSessionRow): QnaAdminSession {
  return {
    id: row.id,
    title: row.title,
    isCurrent: row.is_current,
    acceptingQuestions: row.accepting_questions,
    highlightedQuestionId: row.highlighted_question_id,
    createdAt: row.created_at,
    questionCount: row.qna_questions?.[0]?.count ?? 0,
  }
}

function toAdminQuestion(row: QuestionRow): QnaAdminQuestion {
  return {
    id: row.id,
    body: row.body,
    authorName: row.author_name,
    upvotes: row.upvote_count,
    status: row.status,
    createdAt: row.created_at,
  }
}

function client() {
  try {
    return createSupabaseServiceRoleClient()
  } catch {
    throw new QnaUnavailableError()
  }
}

async function getCurrentSessionRow(): Promise<SessionRow | null> {
  const { data, error } = await client()
    .from('qna_sessions')
    .select(SESSION_COLUMNS)
    .eq('is_current', true)
    .maybeSingle<SessionRow>()
  if (error) throw new QnaUnavailableError()
  return data
}

export async function getPublicQnaSnapshot(): Promise<QnaPublicSnapshot> {
  const session = await getCurrentSessionRow()
  if (!session) return { session: null, questions: [] }

  const { data, error } = await client()
    .from('qna_questions')
    .select(QUESTION_COLUMNS)
    .eq('session_id', session.id)
    .neq('status', 'hidden')
    .order('created_at', { ascending: false })
    .limit(MAX_QUESTIONS)
    .returns<QuestionRow[]>()
  if (error) throw new QnaUnavailableError()

  const questions = (data ?? []).map(toPublicQuestion)
  const highlighted = questions.some((question) => question.id === session.highlighted_question_id)
  return {
    session: {
      id: session.id,
      title: session.title,
      acceptingQuestions: session.accepting_questions,
      highlightedQuestionId: highlighted ? session.highlighted_question_id : null,
    },
    questions,
  }
}

export async function submitQnaQuestion(input: {
  body: string
  authorName: string | null
  visitorToken: string
}): Promise<QnaPublicQuestion | 'closed'> {
  const session = await getCurrentSessionRow()
  if (!session || !session.accepting_questions) return 'closed'

  const { data, error } = await client()
    .from('qna_questions')
    .insert({
      session_id: session.id,
      body: input.body,
      author_name: input.authorName,
      visitor_token_digest: hashQnaVisitorToken(input.visitorToken),
    })
    .select(QUESTION_COLUMNS)
    .single<QuestionRow>()
  if (error || !data) throw new QnaUnavailableError()
  return toPublicQuestion(data)
}

export async function setQnaUpvote(questionId: string, visitorToken: string, upvoted: boolean): Promise<number> {
  const { data, error } = await client().rpc('qna_set_upvote', {
    p_question_id: questionId,
    p_visitor_token_digest: hashQnaVisitorToken(visitorToken),
    p_upvoted: upvoted,
  })
  if (error?.code === 'P0002') throw new QnaNotFoundError()
  if (error || typeof data !== 'number') throw new QnaUnavailableError()
  return data
}

// ---------------------------------------------------------------------------
// Host controls (callers must already have verified staff access)
// ---------------------------------------------------------------------------

async function listAdminQuestions(sessionId: string): Promise<QnaAdminQuestion[]> {
  const { data, error } = await client()
    .from('qna_questions')
    .select(QUESTION_COLUMNS)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(MAX_QUESTIONS)
    .returns<QuestionRow[]>()
  if (error) throw new QnaUnavailableError()
  return (data ?? []).map(toAdminQuestion)
}

export async function getAdminQnaSnapshot(): Promise<QnaAdminSnapshot> {
  const { data: sessionRows, error } = await client()
    .from('qna_sessions')
    .select(ADMIN_SESSION_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<AdminSessionRow[]>()
  if (error) throw new QnaUnavailableError()

  const sessions = (sessionRows ?? []).map(toAdminSession)
  const current = sessions.find((session) => session.isCurrent) ?? null
  return {
    sessions,
    currentSessionId: current?.id ?? null,
    questions: current ? await listAdminQuestions(current.id) : [],
  }
}

/** Questions for any session, including ended ones in the history list. */
export async function getAdminSessionQuestions(sessionId: string): Promise<QnaAdminQuestion[]> {
  const { data, error } = await client().from('qna_sessions').select('id').eq('id', sessionId).maybeSingle()
  if (error) throw new QnaUnavailableError()
  if (!data) throw new QnaNotFoundError()
  return listAdminQuestions(sessionId)
}

/** Permanently remove an ended session; its questions and votes cascade. */
export async function deleteQnaSession(sessionId: string): Promise<void> {
  const supabase = client()
  const { data, error } = await supabase.from('qna_sessions').select('is_current').eq('id', sessionId).maybeSingle<{ is_current: boolean }>()
  if (error) throw new QnaUnavailableError()
  if (!data) throw new QnaNotFoundError()
  if (data.is_current) throw new QnaConflictError('End the session before deleting it.')

  const { error: deleteError } = await supabase.from('qna_sessions').delete().eq('id', sessionId).eq('is_current', false)
  if (deleteError) throw new QnaUnavailableError()
}

async function setCurrentSession(sessionId: string | null): Promise<void> {
  const { error } = await client().rpc('qna_set_current_session', { p_session_id: sessionId })
  if (error?.code === 'P0002') throw new QnaNotFoundError()
  if (error) throw new QnaUnavailableError()
}

export async function createQnaSession(input: { title: string; makeCurrent: boolean; createdBy: string }): Promise<string> {
  const { data, error } = await client()
    .from('qna_sessions')
    .insert({ title: input.title, created_by: input.createdBy })
    .select('id')
    .single<{ id: string }>()
  if (error || !data) throw new QnaUnavailableError()
  if (input.makeCurrent) await setCurrentSession(data.id)
  return data.id
}

export async function updateQnaSession(input: {
  sessionId: string
  title?: string
  isCurrent?: boolean
  acceptingQuestions?: boolean
  highlightedQuestionId?: string | null
}): Promise<void> {
  if (input.highlightedQuestionId) {
    const { data, error } = await client()
      .from('qna_questions')
      .select('id')
      .eq('id', input.highlightedQuestionId)
      .eq('session_id', input.sessionId)
      .maybeSingle()
    if (error) throw new QnaUnavailableError()
    if (!data) throw new QnaNotFoundError()
  }

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.acceptingQuestions !== undefined) patch.accepting_questions = input.acceptingQuestions
  if (input.highlightedQuestionId !== undefined) patch.highlighted_question_id = input.highlightedQuestionId

  if (Object.keys(patch).length > 0) {
    const { data, error } = await client().from('qna_sessions').update(patch).eq('id', input.sessionId).select('id')
    if (error) throw new QnaUnavailableError()
    if (!data?.length) throw new QnaNotFoundError()
  }

  if (input.isCurrent === true) await setCurrentSession(input.sessionId)
  if (input.isCurrent === false) {
    const { error } = await client().from('qna_sessions').update({ is_current: false }).eq('id', input.sessionId)
    if (error) throw new QnaUnavailableError()
  }
}

export async function updateQnaQuestionStatus(questionId: string, status: QnaQuestionStatus): Promise<void> {
  const supabase = client()
  const { data, error } = await supabase
    .from('qna_questions')
    .update({ status })
    .eq('id', questionId)
    .select('session_id')
    .maybeSingle<{ session_id: string }>()
  if (error) throw new QnaUnavailableError()
  if (!data) throw new QnaNotFoundError()

  // A hidden question must never stay on the projector.
  if (status === 'hidden') {
    const { error: clearError } = await supabase
      .from('qna_sessions')
      .update({ highlighted_question_id: null })
      .eq('id', data.session_id)
      .eq('highlighted_question_id', questionId)
    if (clearError) throw new QnaUnavailableError()
  }
}
