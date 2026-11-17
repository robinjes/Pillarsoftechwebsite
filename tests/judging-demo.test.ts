import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const supabase = vi.hoisted(() => vi.fn(() => { throw new Error('Demo must not use Supabase') }))
vi.mock('@/lib/supabase/service', () => ({ createSupabaseServiceRoleClient: supabase }))

import { handleJudgingDemo } from '@/lib/judging-demo'
import type { JudgingAdminSnapshot, JudgingEventDetail } from '@/lib/judging-contracts'

function call(path: string, method = 'GET', body?: unknown, cookie?: string, origin = 'http://localhost:3000') {
  return handleJudgingDemo(new Request(`http://localhost:3000/api/dev/judging/${path}`, {
    method, headers: { origin, ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}),
  }), path.split('?')[0].split('/'))
}

beforeEach(async () => { vi.stubEnv('NODE_ENV', 'development'); await call('reset', 'POST') })
afterEach(() => { expect(supabase).not.toHaveBeenCalled(); vi.unstubAllEnvs() })

describe('local judging sandbox', () => {
  it('is inaccessible in production and rejects cross-origin edits', async () => {
    expect((await call('reset', 'POST', undefined, undefined, 'https://evil.example')).status).toBe(403)
    vi.stubEnv('NODE_ENV', 'production')
    expect((await call('host')).status).toBe(404)
    expect((await call('reset', 'POST')).status).toBe(404)
  })

  it('runs host, judge, score locking, and broadcast flows without Supabase', async () => {
    // A production canonical URL in .env.local must not block localhost demo edits.
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://pillarsoftech.org')
    const snapshot: JudgingAdminSnapshot = await (await call('host')).json()
    const eventId = snapshot.currentEventId!
    const detail: JudgingEventDetail = await (await call(`host/event?eventId=${eventId}`)).json()
    expect(detail.contestants).toHaveLength(3)
    expect((await call('judge/state')).status).toBe(401)
    expect((await call('host/timer', 'POST', { eventId, contestantId: detail.contestants[0].id, action: 'pitch' })).status).toBe(200)
    const login = await call('judge/session', 'POST', { code: 'demo22' })
    expect(login.status).toBe(200)
    const cookie = login.headers.get('set-cookie')!.split(';')[0]
    const judgeState = await (await call('judge/state', 'GET', undefined, cookie)).json()
    expect(judgeState.judge.name).toBe('Demo Judge One')
    expect(judgeState.event.timer.phase).toBe('pitch')
    const contestantId = detail.contestants[2].id
    expect((await call('host', 'PATCH', { eventId, currentContestantId: contestantId })).status).toBe(200)
    expect((await (await call('judge/state', 'GET', undefined, cookie)).json()).event.timer.phase).toBeNull()
    expect((await call('host/timer', 'POST', { eventId, contestantId: detail.contestants[0].id, action: 'qa' })).status).toBe(409)
    await call('host/timer', 'POST', { eventId, contestantId, action: 'qa' })
    const score = { contestantId, problem: 10, creativity: 10, stem: 10, design: 10, pitch: 10, comment: '' }
    expect((await call('judge/scores', 'PUT', score, cookie)).status).toBe(200)
    const access = await (await call('host/broadcast', 'POST', { eventId })).json()
    const broadcast = async () => (await handleJudgingDemo(new Request('http://localhost:3000/api/dev/judging/broadcast', { headers: { authorization: `Bearer ${access.token}` } }), ['broadcast'])).json()
    expect((await broadcast()).current.average).toBe(50)
    expect((await broadcast()).timer.phase).toBe('qa')
    expect((await broadcast()).final).toBe(false)
    await call('host', 'PATCH', { eventId, scoresLocked: true })
    expect((await broadcast()).final).toBe(true)
    expect((await call('judge/scores', 'PUT', score, cookie)).status).toBe(409)
    await call('host', 'PATCH', { eventId, isCurrent: false })
    expect((await broadcast()).timer.phase).toBeNull()
    expect((await call('judge/state', 'GET', undefined, cookie)).status).toBe(401)
    expect((await broadcast()).standings).toHaveLength(3)
  })

  it('supports creating, populating, ending and deleting demo events and resetting samples', async () => {
    const { id: eventId } = await (await call('host', 'POST', { title: 'Test event' })).json()
    await call('host/contestants', 'POST', { eventId, entries: [{ name: 'Test student', project: 'Demo' }] })
    await call('host/judges', 'POST', { eventId, name: 'Test judge' })
    const detail: JudgingEventDetail = await (await call(`host/event?eventId=${eventId}`)).json()
    expect(detail.event.judgeCount).toBe(1)
    expect(detail.event.contestantCount).toBe(1)
    await call('host/contestants', 'DELETE', { contestantId: detail.contestants[0].id })
    await call('host/judges', 'DELETE', { judgeId: detail.judges[0].id })
    expect((await call('host', 'DELETE', { eventId })).status).toBe(409)
    await call('host', 'PATCH', { eventId, isCurrent: false })
    expect((await call('host', 'DELETE', { eventId })).status).toBe(200)
    await call('reset', 'POST')
    expect((await (await call('host')).json()).events).toHaveLength(1)
  })

  it('keeps family scores hidden through locking and ending until explicit release', async () => {
    const { currentEventId: eventId } = await (await call('host')).json()
    const audience = async () => (await call(`audience?eventId=${eventId}`)).json()
    expect(await audience()).toMatchObject({ resultsReleased: false, results: null })
    expect((await call('host/audience', 'POST', { eventId, resultsReleased: true })).status).toBe(409)
    await call('host/audience', 'POST', { eventId, awardsMessage: 'Awards after all presentations' })
    await call('host', 'PATCH', { eventId, scoresLocked: true, isCurrent: false })
    expect(await audience()).toMatchObject({ resultsReleased: false, results: null, awardsMessage: 'Awards after all presentations' })
    await call('host/audience', 'POST', { eventId, resultsReleased: true })
    expect((await audience()).results).toHaveLength(3)
    await call('host/audience', 'POST', { eventId, resultsReleased: false })
    expect((await audience()).results).toBeNull()
    await call('host/audience', 'POST', { eventId, resultsReleased: true })
    await call('host', 'PATCH', { eventId, isCurrent: true })
    expect((await audience()).results).toBeNull()
    await call('host/audience', 'POST', { eventId, resultsReleased: true })
    await call('host', 'PATCH', { eventId, scoresLocked: false })
    expect((await audience()).results).toBeNull()
  })
})
