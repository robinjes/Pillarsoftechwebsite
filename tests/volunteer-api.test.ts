import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireStaff: vi.fn(),
  authContext: vi.fn(),
  volunteerAuthContext: vi.fn(),
  createClient: vi.fn(),
  getProfile: vi.fn(),
  getEventTitle: vi.fn(),
  listOwnRegistrations: vi.fn(),
  listStaffProfiles: vi.fn(),
  listEventRoster: vi.fn(),
  listActiveAttendance: vi.fn(),
  listAllAttendanceRows: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/server', () => ({
  requireVerifiedUser: mocks.requireUser,
  requireVerifiedStaff: mocks.requireStaff,
  getVerifiedAuthContext: mocks.authContext,
  getVerifiedVolunteerAuthContext: mocks.volunteerAuthContext,
}))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: mocks.createClient }))
vi.mock('@/lib/volunteer-server', () => ({
  getProfile: mocks.getProfile,
  getEventTitle: mocks.getEventTitle,
  listOwnRegistrations: mocks.listOwnRegistrations,
  listStaffProfiles: mocks.listStaffProfiles,
  listEventRoster: mocks.listEventRoster,
  listActiveAttendance: mocks.listActiveAttendance,
  listAllAttendanceRows: mocks.listAllAttendanceRows,
}))

import { GET as getMe } from '@/app/api/me/route'
import { POST as register } from '@/app/api/volunteer/register/route'
import { POST as cancel } from '@/app/api/volunteer/cancel/route'
import { GET as registrations } from '@/app/api/volunteer/registrations/route'
import { GET as volunteers } from '@/app/api/admin/volunteers/route'
import { GET as roster } from '@/app/api/admin/volunteers/roster/route'
import { POST as attendance } from '@/app/api/admin/attendance/route'
import { POST as hours } from '@/app/api/admin/hours/route'

const user = { ok: true as const, user: { id: '11111111-1111-4111-8111-111111111111', email: 'volunteer@example.test' } }
const staff = { ok: true as const, isStaff: true as const, user: { id: '22222222-2222-4222-8222-222222222222', email: 'owner@example.test' } }
const failure = (code: 'unauthenticated' | 'not_staff') => ({
  ok: false as const,
  code,
  status: code === 'unauthenticated' ? 401 as const : 403 as const,
  message: code === 'unauthenticated' ? 'A verified sign-in is required.' : 'This account is not authorized for staff access.',
})

function responseBody(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

function requestJson(url: string, body: unknown, origin = 'https://pillarsoftech.org') {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin },
    body: JSON.stringify(body),
  })
}

describe('verified volunteer and staff route boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createClient.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: {
          id: 'registration-1', user_id: user.user.id, event_id: 'event-1', status: 'registered',
          hours: 0, created_at: '2026-08-18T00:00:00.000Z',
        },
        error: null,
      }),
    })
    mocks.getEventTitle.mockResolvedValue('Event One')
    mocks.requireUser.mockResolvedValue(user)
    mocks.requireStaff.mockResolvedValue(staff)
    mocks.authContext.mockResolvedValue({ ...user, isStaff: false })
    mocks.volunteerAuthContext.mockResolvedValue({ ...user, isStaff: false })
    mocks.getProfile.mockResolvedValue({
      id: user.user.id, name: 'Ada Volunteer', email: user.user.email,
      memberCode: 'POT-ABCDEF1234567890', createdAt: '2026-08-18T00:00:00.000Z',
      totalHours: 2, isStaff: false, role: 'volunteer',
    })
  })

  it('returns 401 for signed-out DTO and volunteer mutation requests', async () => {
    mocks.authContext.mockResolvedValue(failure('unauthenticated'))
    mocks.volunteerAuthContext.mockResolvedValue(failure('unauthenticated'))
    mocks.requireUser.mockResolvedValue(failure('unauthenticated'))
    expect((await getMe()).status).toBe(401)
    expect((await registrations()).status).toBe(401)
    expect((await register(requestJson('https://pillarsoftech.org/api/volunteer/register', { eventId: 'event-1' }))).status).toBe(401)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('returns only the verified profile DTO and never a staff membership row', async () => {
    const response = await getMe()
    expect(response.status).toBe(200)
    const body = await responseBody(response)
    expect(body).toEqual({
      profile: {
        id: user.user.id,
        name: 'Ada Volunteer',
        email: user.user.email,
        memberCode: 'POT-ABCDEF1234567890',
        createdAt: '2026-08-18T00:00:00.000Z',
        totalHours: 2,
        isStaff: false,
        role: 'volunteer',
      },
    })
  })

  it('rejects caller identity, role, hours, timestamps, and destinations', async () => {
    const response = await register(requestJson('https://pillarsoftech.org/api/volunteer/register', {
      eventId: 'event-1', userId: 'forged', role: 'staff', hours: 99,
      timestamp: '2026-08-18T00:00:00.000Z', destination: 'https://evil.example',
    }))
    expect(response.status).toBe(400)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('calls registration RPC with only the validated event id and returns a safe DTO', async () => {
    const client = await mocks.createClient()
    const response = await register(requestJson('https://pillarsoftech.org/api/volunteer/register', { eventId: 'event-1' }))
    expect(response.status).toBe(201)
    expect(client.rpc).toHaveBeenCalledWith('register_for_event', { p_event_id: 'event-1' })
    expect(await responseBody(response)).toMatchObject({ registration: { eventId: 'event-1', eventTitle: 'Event One' } })
  })

  it('does not claim cancellation succeeded when the RPC rejects an ineligible registration', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: '22023', message: 'database detail' } })
    mocks.createClient.mockResolvedValue({ rpc })
    const response = await cancel(requestJson('https://pillarsoftech.org/api/volunteer/cancel', { eventId: 'event-1' }))
    expect(response.status).toBe(409)
    const body = await responseBody(response)
    expect(body).not.toHaveProperty('cancelled')
    expect(JSON.stringify(body)).not.toContain('database detail')
  })

  it('returns 403 for nonstaff roster/search and allows staff DTO reads', async () => {
    mocks.requireStaff.mockResolvedValue(failure('not_staff'))
    expect((await volunteers(new Request('https://pillarsoftech.org/api/admin/volunteers?q=staff'))).status).toBe(403)
    expect((await roster(new Request('https://pillarsoftech.org/api/admin/volunteers/roster?eventId=event-1'))).status).toBe(403)
    mocks.requireStaff.mockResolvedValue(staff)
    mocks.listStaffProfiles.mockResolvedValue([])
    const response = await volunteers(new Request('https://pillarsoftech.org/api/admin/volunteers'))
    expect(response.status).toBe(200)
    expect(await responseBody(response)).toEqual({ profiles: [] })
  })

  it('rejects malicious staff search grammar before PostgREST interpolation', async () => {
    const response = await volunteers(new Request('https://pillarsoftech.org/api/admin/volunteers?q=%29%2Cor%2Cid.eq.secret'))
    expect(response.status).toBe(400)
    expect(mocks.listStaffProfiles).not.toHaveBeenCalled()
  })

  it('rejects attendance and hours envelopes before any RPC call', async () => {
    const invalidAttendance = await attendance(requestJson('https://pillarsoftech.org/api/admin/attendance', {
      memberCode: 'POT-123456', eventId: 'event-1', userId: 'forged', status: 'attended', checkedInAt: 'now',
    }))
    const invalidHours = await hours(requestJson('https://pillarsoftech.org/api/admin/hours', {
      userId: user.user.id, delta: 0, reason: '', totalHours: 500, role: 'volunteer',
    }))
    expect(invalidAttendance.status).toBe(400)
    expect(invalidHours.status).toBe(400)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('enforces 401/403 on staff mutations and rejects cross-origin requests', async () => {
    mocks.requireStaff.mockResolvedValue(failure('unauthenticated'))
    expect((await attendance(requestJson('https://pillarsoftech.org/api/admin/attendance', { memberCode: 'POT-123456', eventId: 'event-1' }))).status).toBe(401)
    expect((await hours(requestJson('https://pillarsoftech.org/api/admin/hours', { userId: user.user.id, delta: 1, reason: 'Correction' }))).status).toBe(401)

    mocks.requireStaff.mockResolvedValue(failure('not_staff'))
    expect((await attendance(requestJson('https://pillarsoftech.org/api/admin/attendance', { memberCode: 'POT-123456', eventId: 'event-1' }))).status).toBe(403)
    expect((await hours(requestJson('https://pillarsoftech.org/api/admin/hours', { userId: user.user.id, delta: 1, reason: 'Correction' }))).status).toBe(403)

    mocks.requireStaff.mockResolvedValue(staff)
    const response = await attendance(requestJson('https://pillarsoftech.org/api/admin/attendance', { memberCode: 'POT-123456', eventId: 'event-1' }, 'https://evil.example'))
    expect(response.status).toBe(403)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('returns the database-produced atomic attendance result without client-side hour math', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        profile: {
          id: user.user.id, full_name: 'Ada Volunteer', email: user.user.email,
          member_code: 'POT-123456', total_hours: 3.25, created_at: '2026-08-18T00:00:00.000Z',
        },
        registration: { id: 'registration-1', user_id: user.user.id, event_id: 'event-1', status: 'attended', hours: 1.25, created_at: '2026-08-18T00:00:00.000Z' },
        action: 'checkedOut', hours_logged: 1.25, check_in_at: '2026-08-18T00:00:00.000Z', check_out_at: '2026-08-18T01:15:00.000Z',
      },
      error: null,
    })
    mocks.createClient.mockResolvedValue({ rpc })
    const response = await attendance(requestJson('https://pillarsoftech.org/api/admin/attendance', { memberCode: 'POT-123456', eventId: 'event-1' }))
    expect(response.status).toBe(200)
    expect(await responseBody(response)).toMatchObject({ attendance: { action: 'checkedOut', hoursLogged: 1.25, totalHours: 3.25 } })
    expect(rpc).toHaveBeenCalledWith('staff_check_in_or_out', { p_member_code: 'POT-123456', p_event_id: 'event-1' })
  })

  it('returns the RPC total after a meaningful staff adjustment and keeps raw errors private', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { id: user.user.id, full_name: 'Ada Volunteer', email: user.user.email, member_code: 'POT-123456', total_hours: 4, created_at: '2026-08-18T00:00:00.000Z' },
      error: null,
    })
    mocks.createClient.mockResolvedValue({ rpc })
    const response = await hours(requestJson('https://pillarsoftech.org/api/admin/hours', { userId: user.user.id, delta: 1, reason: 'Verified correction' }))
    expect(response.status).toBe(200)
    expect(await responseBody(response)).toMatchObject({ profile: { totalHours: 4 } })
    expect(rpc).toHaveBeenCalledWith('staff_adjust_volunteer_hours', { p_user_id: user.user.id, p_hours: 1, p_reason: 'Verified correction' })
  })
})

describe('volunteer client and staff-page static boundaries', () => {
  it('uses route DTOs instead of direct protected browser queries or mock data', () => {
    const service = readFileSync(path.resolve(process.cwd(), 'src/lib/volunteerService.ts'), 'utf8')
    const analytics = readFileSync(path.resolve(process.cwd(), 'src/app/(admin-protected)/admin/analytics/page.tsx'), 'utf8')
    const dashboard = readFileSync(path.resolve(process.cwd(), 'src/app/(admin-protected)/admin/page.tsx'), 'utf8')
    expect(service).not.toMatch(/\.from\(|\.rpc\(/)
    expect(service).not.toMatch(/localStorage|sessionStorage|Math\.random|mock/i)
    expect(analytics).not.toMatch(/Math\.random|mock data|mock calculation/i)
    expect(dashboard).not.toMatch(/Math\.random|mock data|mock calculation/i)
    expect(existsSync(path.resolve(process.cwd(), 'src/components/CheckInWidget.tsx'))).toBe(false)
  })

  it('keeps the staff layout server-protected and the scanner lazy', () => {
    const layout = readFileSync(path.resolve(process.cwd(), 'src/app/volunteer/checkin/layout.tsx'), 'utf8')
    const scanner = readFileSync(path.resolve(process.cwd(), 'src/app/volunteer/checkin/page.tsx'), 'utf8')
    expect(layout).toContain('requireVerifiedStaff')
    expect(scanner).toContain("import('html5-qrcode')")
    expect(scanner).not.toContain("import { Html5Qrcode } from 'html5-qrcode'")
  })
})
