import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const staff = vi.hoisted(() => vi.fn())
const detail = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: staff }))
vi.mock('@/lib/judging-server', () => ({
  getJudgingEventDetail: detail,
  JudgingUnavailableError: class extends Error {},
  JudgingNotFoundError: class extends Error {},
  JudgingConflictError: class extends Error {},
}))

import { createBroadcastToken, verifyBroadcastToken } from '@/lib/judging-broadcast-server'
import { broadcastSnapshot } from '@/lib/judging-broadcast'
import { GET } from '@/app/api/judging/broadcast/route'
import { POST } from '@/app/api/admin/judging/broadcast/route'
import type { JudgingEventDetail } from '@/lib/judging-contracts'

const eventId = '00000000-0000-4000-8000-0000000000e1'
const fixture: JudgingEventDetail = {
  event: { id: eventId, title: 'Pitch night', scoresLocked: false, currentContestantId: 'a', isCurrent: true, createdAt: '', judgeCount: 2, contestantCount: 3 },
  contestants: [{ id: 'a', name: 'Ava', project: 'Robot' }, { id: 'b', name: 'Bo', project: '' }, { id: 'c', name: 'Cam', project: '' }],
  judges: [{ id: 'j', name: 'Judge 1', accessCode: 'SECRET' }, { id: 'k', name: 'Judge 2', accessCode: 'HIDDEN' }],
  scores: [
    { contestantId: 'a', judgeId: 'j', problem: 8, creativity: 8, stem: 8, design: 8, pitch: 8, comment: 'Private feedback', updatedAt: '' },
    { contestantId: 'a', judgeId: 'k', problem: 1, creativity: null, stem: null, design: null, pitch: null, comment: '', updatedAt: '' },
    { contestantId: 'b', judgeId: 'j', problem: 8, creativity: 8, stem: 8, design: 8, pitch: 8, comment: '', updatedAt: '' },
  ],
}

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('OBS access', () => {
  it('binds tokens to an event and rejects tampering, expiry, and judge codes', () => {
    vi.stubEnv('CHAT_TOKEN_PEPPER', 'broadcast-test-pepper')
    const now = Date.now()
    const { token } = createBroadcastToken(eventId, now)
    expect(verifyBroadcastToken(token, now)).toBe(eventId)
    expect(verifyBroadcastToken(token.replace(eventId, '00000000-0000-4000-8000-0000000000e2'), now)).toBeNull()
    expect(verifyBroadcastToken(`${token}x`, now)).toBeNull()
    expect(verifyBroadcastToken(token, now + 7 * 24 * 60 * 60 * 1000)).toBeNull()
    expect(verifyBroadcastToken('K7P4QM', now)).toBeNull()
  })

  it('requires staff and same origin to issue links', async () => {
    staff.mockResolvedValueOnce({ ok: false, status: 401, code: 'unauthenticated', message: 'Sign in.' })
    const request = (origin: string) => new Request('https://pillarsoftech.org/api/admin/judging/broadcast', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ eventId }) })
    expect((await POST(request('https://pillarsoftech.org'))).status).toBe(401)
    staff.mockResolvedValue({ ok: true, user: { id: 'staff' } })
    expect((await POST(request('https://evil.example'))).status).toBe(403)
    expect(detail).not.toHaveBeenCalled()
    vi.stubEnv('CHAT_TOKEN_PEPPER', 'broadcast-test-pepper')
    detail.mockResolvedValue(fixture)
    const issued = await POST(request('https://pillarsoftech.org'))
    expect(issued.status).toBe(200)
    expect(verifyBroadcastToken((await issued.json()).token)).toBe(eventId)
  })

  it('requires a broadcast token and returns only safe fields without caching', async () => {
    vi.stubEnv('CHAT_TOKEN_PEPPER', 'broadcast-test-pepper')
    const url = 'https://pillarsoftech.org/api/judging/broadcast'
    expect((await GET(new Request(url))).status).toBe(401)
    expect(detail).not.toHaveBeenCalled()
    detail.mockResolvedValue(fixture)
    const response = await GET(new Request(url, { headers: { authorization: `Bearer ${createBroadcastToken(eventId).token}` } }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(detail).toHaveBeenCalledWith(eventId)
    const serialized = JSON.stringify(await response.json())
    for (const secret of ['SECRET', 'HIDDEN', 'Private feedback', 'judgeId', 'accessCode']) expect(serialized).not.toContain(secret)
  })
})

describe('broadcast scoring', () => {
  it('ignores partial scores, reports waiting judges, preserves ties and unscored students', () => {
    const result = broadcastSnapshot(fixture)
    expect(result.current?.average).toBe(40)
    expect(result.current?.judges.map((judge) => judge.total)).toEqual([40, null])
    expect(result.standings.map((row) => [row.rank, row.average])).toEqual([[1, 40], [1, 40], [null, null]])
    expect(result.final).toBe(false)
    expect(broadcastSnapshot({ ...fixture, event: { ...fixture.event, scoresLocked: true } }).final).toBe(true)
    expect(broadcastSnapshot({ ...fixture, event: { ...fixture.event, currentContestantId: null } }).current).toBeNull()
  })
})
