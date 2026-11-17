import 'server-only'

import { randomUUID } from 'node:crypto'
import { controlDemoTimer, idleTimer, timerControlSchema } from '@/lib/judging-timer'
import { audienceControlSchema, audienceSnapshot } from '@/lib/judging-audience'
import { broadcastSnapshot } from '@/lib/judging-broadcast'
import {
  contestantsAddSchema, contestantRemoveSchema, judgeAddSchema, judgeRemoveSchema,
  judgingEventCreateSchema, judgingEventDeleteSchema, judgingEventUpdateSchema,
  RUBRIC_KEYS, scoreSaveSchema, type RubricScores, type JudgingEventDetail,
} from '@/lib/judging-contracts'
import { jsonNoStore, sameOriginFailure } from '@/lib/volunteer-api'

function seed(): JudgingEventDetail[] {
  const contestants = [
    { id: randomUUID(), name: 'Demo Alex', project: 'Solar backpack' },
    { id: randomUUID(), name: 'Demo Maya', project: 'Recycling robot' },
    { id: randomUUID(), name: 'Demo Sam', project: 'Smart garden' },
  ]
  const judges = [
    { id: randomUUID(), name: 'Demo Judge One', accessCode: 'DEMO22' },
    { id: randomUUID(), name: 'Demo Judge Two', accessCode: 'DEMO33' },
  ]
  return [{
    event: { id: randomUUID(), title: 'Local demo · Pitch night', isCurrent: true, scoresLocked: false, currentContestantId: contestants[0].id, createdAt: new Date().toISOString(), contestantCount: 3, judgeCount: 2 },
    contestants, judges,
    scores: contestants.slice(0, 2).flatMap((contestant, index) => judges.map((judge, judgeIndex) => ({
      contestantId: contestant.id, judgeId: judge.id, problem: 8 + index, creativity: 7 + judgeIndex,
      stem: 9, design: 8, pitch: 8 + index, comment: 'Sample feedback', updatedAt: new Date().toISOString(),
    }))),
  }]
}

// Survives dev hot reloads; nothing is written to a database or to disk.
const memory = globalThis as typeof globalThis & { judgingDemoEvents?: JudgingEventDetail[] }
const COOKIE = 'pot_judging_demo'
const cookiePath = '/api/dev/judging'

export async function handleJudgingDemo(request: Request, path: string[]) {
  // Guard before initializing data or parsing requests; never enabled in a build.
  if (process.env.NODE_ENV !== 'development') return jsonNoStore({ error: 'Not found.' }, 404)
  const origin = request.headers.get('origin')
  if (request.method !== 'GET' && origin !== null && origin !== new URL(request.url).origin) return sameOriginFailure()
  memory.judgingDemoEvents ??= seed()
  const events = memory.judgingDemoEvents
  const route = path.join('/')
  const method = request.method
  const params = new URL(request.url).searchParams
  const body = method === 'GET' ? null : await request.json().catch(() => null)
  const fail = () => jsonNoStore({ error: 'Invalid demo request.' }, 400)
  const missing = () => jsonNoStore({ error: 'Demo event or item no longer exists. Reload the demo page.' }, 404)
  const findEvent = (id: string) => events.find((item) => item.event.id === id)
  const recount = () => events.forEach((item) => { item.event.timer = { ...(item.event.timer ?? idleTimer()), serverNow: new Date().toISOString() }; item.event.contestantCount = item.contestants.length; item.event.judgeCount = item.judges.length })

  if (route === 'reset' && method === 'POST') {
    memory.judgingDemoEvents = seed()
    return jsonNoStore({ ok: true })
  }
  if (route === 'audience' && method === 'GET') {
    const item = findEvent(params.get('eventId') ?? '')
    return item ? jsonNoStore(audienceSnapshot(item)) : missing()
  }
  if (route === 'host/audience' && method === 'POST') {
    const input = audienceControlSchema.safeParse(body)
    if (!input.success) return fail()
    const item = findEvent(input.data.eventId)
    if (!item) return missing()
    if (input.data.resultsReleased && !item.event.scoresLocked) return jsonNoStore({ error: 'Lock scores before releasing results to families.' }, 409)
    if (input.data.awardsMessage !== undefined) item.event.awardsMessage = input.data.awardsMessage
    if (input.data.resultsReleased !== undefined) item.event.resultsReleased = input.data.resultsReleased
    return jsonNoStore({ ok: true })
  }
  if (route === 'host/timer' && method === 'POST') {
    const input = timerControlSchema.safeParse(body)
    if (!input.success) return fail()
    const item = findEvent(input.data.eventId)
    if (!item) return missing()
    if (item.event.currentContestantId !== input.data.contestantId || (input.data.action !== 'reset' && (!item.event.isCurrent || !item.event.currentContestantId))) return jsonNoStore({ error: 'Select the current student in an open event first.' }, 409)
    item.event.timer = controlDemoTimer(item.event.timer, input.data.action)
    return jsonNoStore({ ok: true })
  }
  if (route === 'host' && method === 'GET') {
    recount()
    return jsonNoStore({ events: events.map((item) => item.event), currentEventId: events.find((item) => item.event.isCurrent)?.event.id ?? null })
  }
  if (route === 'host/event' && method === 'GET') {
    recount()
    const item = findEvent(params.get('eventId') ?? '')
    return item ? jsonNoStore(item) : missing()
  }
  if (route === 'host' && method === 'POST') {
    const input = judgingEventCreateSchema.safeParse(body)
    if (!input.success) return fail()
    events.forEach((item) => { item.event.isCurrent = false; item.event.timer = idleTimer() })
    const id = randomUUID()
    events.unshift({ event: { id, title: input.data.title, isCurrent: true, scoresLocked: false, currentContestantId: null, createdAt: new Date().toISOString(), contestantCount: 0, judgeCount: 0 }, contestants: [], judges: [], scores: [] })
    return jsonNoStore({ id }, 201)
  }
  if (route === 'host' && method === 'PATCH') {
    const input = judgingEventUpdateSchema.safeParse(body)
    if (!input.success) return fail()
    const item = findEvent(input.data.eventId)
    if (!item) return missing()
    const { title, isCurrent, scoresLocked, currentContestantId } = input.data
    const patch = { title, isCurrent, scoresLocked, currentContestantId }
    if (patch.currentContestantId && !item.contestants.some((row) => row.id === patch.currentContestantId)) return missing()
    if (patch.isCurrent) events.forEach((other) => { if (other !== item) { other.event.isCurrent = false; other.event.timer = idleTimer() } })
    if ((patch.currentContestantId !== undefined && patch.currentContestantId !== item.event.currentContestantId) || patch.isCurrent === false) item.event.timer = idleTimer()
    if (patch.scoresLocked === false || (patch.isCurrent === true && !item.event.isCurrent)) item.event.resultsReleased = false
    Object.assign(item.event, Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)))
    return jsonNoStore({ ok: true })
  }
  if (route === 'host' && method === 'DELETE') {
    const input = judgingEventDeleteSchema.safeParse(body)
    if (!input.success) return fail()
    const index = events.findIndex((item) => item.event.id === input.data.eventId)
    if (index < 0) return missing()
    if (events[index].event.isCurrent) return jsonNoStore({ error: 'End the event before deleting it.' }, 409)
    events.splice(index, 1)
    return jsonNoStore({ ok: true })
  }
  if (route === 'host/contestants' && method === 'POST') {
    const input = contestantsAddSchema.safeParse(body)
    if (!input.success) return fail()
    const item = findEvent(input.data.eventId)
    if (!item) return missing()
    item.contestants.push(...input.data.entries.map((entry) => ({ id: randomUUID(), ...entry })))
    return jsonNoStore({ ok: true })
  }
  if (route === 'host/judges' && method === 'POST') {
    const input = judgeAddSchema.safeParse(body)
    if (!input.success) return fail()
    const item = findEvent(input.data.eventId)
    if (!item) return missing()
    const judge = { id: randomUUID(), name: input.data.name, accessCode: `DEMO${events.flatMap((event) => event.judges).length + 22}` }
    item.judges.push(judge)
    return jsonNoStore(judge, 201)
  }
  if ((route === 'host/contestants' || route === 'host/judges') && method === 'DELETE') {
    const contestant = contestantRemoveSchema.safeParse(body)
    const judge = judgeRemoveSchema.safeParse(body)
    if (route === 'host/contestants' && contestant.success) {
      const item = events.find((event) => event.contestants.some((row) => row.id === contestant.data.contestantId))
      if (!item) return missing()
      item.contestants = item.contestants.filter((row) => row.id !== contestant.data.contestantId)
      item.scores = item.scores.filter((row) => row.contestantId !== contestant.data.contestantId)
      if (item.event.currentContestantId === contestant.data.contestantId) { item.event.currentContestantId = null; item.event.timer = idleTimer() }
    } else if (route === 'host/judges' && judge.success) {
      const item = events.find((event) => event.judges.some((row) => row.id === judge.data.judgeId))
      if (!item) return missing()
      item.judges = item.judges.filter((row) => row.id !== judge.data.judgeId)
      item.scores = item.scores.filter((row) => row.judgeId !== judge.data.judgeId)
    } else return fail()
    return jsonNoStore({ ok: true })
  }
  if (route === 'host/broadcast' && method === 'POST') {
    const item = findEvent(body?.eventId)
    return item ? jsonNoStore({ token: item.event.id, expiresAt: new Date(Date.now() + 604800000).toISOString() }) : missing()
  }
  if (route === 'broadcast' && method === 'GET') {
    recount()
    const item = findEvent(request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '')
    return item ? jsonNoStore(broadcastSnapshot(item)) : missing()
  }

  if (route === 'judge/session' && method === 'POST') {
    // Demo codes deliberately contain O, which real judge codes exclude.
    const code = typeof body?.code === 'string' ? body.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
    const item = events.find((event) => event.event.isCurrent && event.judges.some((row) => row.accessCode === code))
    const judge = item?.judges.find((row) => row.accessCode === code)
    if (!judge) return jsonNoStore({ error: 'That demo code did not work.' }, 401)
    const response = jsonNoStore({ ok: true })
    response.headers.set('Set-Cookie', `${COOKIE}=${judge.id}; Path=${cookiePath}; HttpOnly; SameSite=Lax`)
    return response
  }
  if (route === 'judge/session' && method === 'DELETE') {
    const response = jsonNoStore({ ok: true })
    response.headers.set('Set-Cookie', `${COOKIE}=; Path=${cookiePath}; Max-Age=0; HttpOnly; SameSite=Lax`)
    return response
  }
  const judgeId = (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  const item = events.find((event) => event.event.isCurrent && event.judges.some((row) => row.id === judgeId))
  const judge = item?.judges.find((row) => row.id === judgeId)
  if (route.startsWith('judge/') && (!item || !judge)) return jsonNoStore({ error: 'Sign in with a demo judge code.' }, 401)
  if (route === 'judge/state' && method === 'GET' && item && judge) {
    recount()
    return jsonNoStore({ judge: { id: judge.id, name: judge.name }, event: item.event, currentContestantId: item.event.currentContestantId, contestants: item.contestants, scores: item.scores.filter((row) => row.judgeId === judge.id) })
  }
  if (route === 'judge/scores' && method === 'PUT' && item && judge) {
    const input = scoreSaveSchema.safeParse(body)
    if (!input.success) return fail()
    if (input.data.session && (input.data.session.judgeId !== judge.id || input.data.session.eventId !== item.event.id)) return jsonNoStore({ error: 'session_changed' }, 409)
    if (item.event.scoresLocked) return jsonNoStore({ locked: true }, 409)
    if (!item.contestants.some((row) => row.id === input.data.contestantId)) return missing()
    const score = { contestantId: input.data.contestantId, ...Object.fromEntries(RUBRIC_KEYS.map((key) => [key, input.data[key]])) as RubricScores, comment: input.data.comment, judgeId: judge.id, updatedAt: new Date().toISOString() }
    item.scores = item.scores.filter((row) => !(row.judgeId === judge.id && row.contestantId === score.contestantId))
    item.scores.push(score)
    return jsonNoStore({ score })
  }
  return missing()
}
