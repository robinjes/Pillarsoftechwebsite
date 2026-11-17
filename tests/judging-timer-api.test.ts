import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const staff = vi.hoisted(() => vi.fn())
const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: staff }))
vi.mock('@/lib/supabase/service', () => ({ createSupabaseServiceRoleClient: () => ({ rpc }) }))

import { POST } from '@/app/api/admin/judging/timer/route'

const eventId = '00000000-0000-4000-8000-0000000000e1'
const contestantId = '00000000-0000-4000-8000-0000000000c1'
const request = (body: unknown, origin = 'https://pillarsoftech.org') => new Request('https://pillarsoftech.org/api/admin/judging/timer', {
  method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
})
afterEach(() => { vi.resetAllMocks() })

describe('timer host authorization and persistence', () => {
  it('rejects guests, cross-origin requests, and invalid commands before calling the database', async () => {
    staff.mockResolvedValue({ ok: false, code: 'unauthenticated', status: 401, message: 'Sign in.' })
    expect((await POST(request({ eventId, contestantId, action: 'pitch' }))).status).toBe(401)
    staff.mockResolvedValue({ ok: true })
    expect((await POST(request({ eventId, contestantId, action: 'pitch' }, 'https://evil.example'))).status).toBe(403)
    expect((await POST(request({ eventId, contestantId, action: 'extend' }))).status).toBe(400)
    expect((await POST(request({ eventId, action: 'pitch' }))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('uses an atomic event/contestant command and reports a stale student or unavailable storage', async () => {
    staff.mockResolvedValue({ ok: true })
    rpc.mockResolvedValue({ error: null })
    expect((await POST(request({ eventId, contestantId, action: 'pitch' }))).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('judging_control_timer', { p_event_id: eventId, p_contestant_id: contestantId, p_action: 'pitch' })
    rpc.mockResolvedValue({ error: { code: 'P0001' } })
    expect((await POST(request({ eventId, contestantId, action: 'qa' }))).status).toBe(409)
    rpc.mockResolvedValue({ error: { code: 'P0002' } })
    expect((await POST(request({ eventId, contestantId, action: 'pause' }))).status).toBe(404)
    rpc.mockResolvedValue({ error: { code: 'network_error' } })
    expect((await POST(request({ eventId, contestantId, action: 'reset' }))).status).toBe(503)
  })
})
