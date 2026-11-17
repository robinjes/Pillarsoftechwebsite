import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const staff = vi.hoisted(() => vi.fn())
const rpc = vi.hoisted(() => vi.fn())
const state = vi.hoisted(() => ({
  event: null as Record<string, unknown> | null,
  scoreReads: 0,
}))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: staff }))
vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceRoleClient: () => ({
    rpc,
    from: (table: string) => {
      if (table === 'judging_scores') state.scoreReads++
      const query = {
        select: () => query, eq: () => query, order: () => query,
        maybeSingle: async () => ({ data: state.event, error: null }),
        returns: async () => ({ data: table === 'judging_contestants' ? [
          { id: 'student-a', name: 'Alex', project: 'Robot' },
          { id: 'student-b', name: 'Maya', project: 'Solar' },
          { id: 'student-c', name: 'Sam', project: '' },
        ] : [
          { contestant_id: 'student-a', judge_id: 'private-judge', problem: 8, creativity: 8, stem: 8, design: 8, pitch: 8, comment: 'Private feedback', updated_at: '' },
          { contestant_id: 'student-b', judge_id: 'private-judge', problem: 8, creativity: 8, stem: 8, design: 8, pitch: 8, comment: 'Private feedback', updated_at: '' },
          { contestant_id: 'student-a', judge_id: 'partial-judge', problem: 1, creativity: null, stem: null, design: null, pitch: null, comment: '', updated_at: '' },
        ], error: null }),
      }
      return query
    },
  }),
}))

import { GET } from '@/app/api/judging/audience/route'
import { POST } from '@/app/api/admin/judging/audience/route'

const eventId = '00000000-0000-4000-8000-0000000000e1'
const get = () => GET(new Request(`https://pillarsoftech.org/api/judging/audience?eventId=${eventId}&resultsReleased=true`))
const post = (body: unknown, origin = 'https://pillarsoftech.org') => POST(new Request('https://pillarsoftech.org/api/admin/judging/audience', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }))

beforeEach(() => {
  state.event = { id: eventId, title: 'Pitch night', is_current: true, scores_locked: false, results_released: false, awards_message: 'Awards at 6 PM', current_contestant_id: 'student-a', created_at: '' }
  state.scoreReads = 0
  staff.mockResolvedValue({ ok: true })
  rpc.mockResolvedValue({ error: null })
})
afterEach(() => vi.resetAllMocks())

describe('public family results', () => {
  it('shows current/next and awards information without reading or transmitting unreleased scores', async () => {
    const response = await get()
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.json()).toMatchObject({ current: { name: 'Alex' }, next: { name: 'Maya' }, totalPresentations: 3, presentationNumber: 1, awardsMessage: 'Awards at 6 PM', resultsReleased: false, results: null })
    expect(state.scoreReads).toBe(0)
    state.event!.scores_locked = true
    state.event!.is_current = false
    expect(await (await get()).json()).toMatchObject({ resultsReleased: false, results: null, current: null, next: null })
    expect(state.scoreReads).toBe(0)
  })

  it('returns all final results together after release, preserves ties and excludes private details', async () => {
    state.event!.scores_locked = true
    state.event!.results_released = true
    const data = await (await get()).json()
    expect(data.results.map((row: { rank: number | null; average: number | null }) => [row.rank, row.average])).toEqual([[1, 40], [1, 40], [null, null]])
    const text = JSON.stringify(data)
    for (const secret of ['judge', 'Private feedback', 'accessCode', 'student-a', 'comment']) expect(text).not.toContain(secret)
    state.event!.scores_locked = false
    const reads = state.scoreReads
    expect(await (await get()).json()).toMatchObject({ resultsReleased: false, results: null })
    expect(state.scoreReads).toBe(reads)
  })

  it('rejects invalid and missing events', async () => {
    expect((await GET(new Request('https://pillarsoftech.org/api/judging/audience?eventId=bad'))).status).toBe(400)
    state.event = null
    expect((await get()).status).toBe(404)
  })
})

describe('admin audience controls', () => {
  it('requires staff, same origin, and valid awards/release settings', async () => {
    staff.mockResolvedValueOnce({ ok: false, code: 'unauthenticated', status: 401, message: 'Sign in.' })
    expect((await post({ eventId, resultsReleased: true })).status).toBe(401)
    expect((await post({ eventId, resultsReleased: true }, 'https://evil.example')).status).toBe(403)
    expect((await post({ eventId })).status).toBe(400)
    expect((await post({ eventId, awardsMessage: 'x'.repeat(241) })).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('saves announcements and releases or hides through the atomic database function', async () => {
    expect((await post({ eventId, awardsMessage: 'After the awards', resultsReleased: true })).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('judging_control_audience', { p_event_id: eventId, p_awards_message: 'After the awards', p_released: true })
    await post({ eventId, resultsReleased: false })
    expect(rpc).toHaveBeenLastCalledWith('judging_control_audience', { p_event_id: eventId, p_awards_message: null, p_released: false })
    rpc.mockResolvedValueOnce({ error: { code: 'P0001' } })
    expect((await post({ eventId, resultsReleased: true })).status).toBe(409)
  })
})
