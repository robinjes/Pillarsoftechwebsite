import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, serviceMock } = vi.hoisted(() => ({ authMock: vi.fn(), serviceMock: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: authMock }))
vi.mock('@/lib/supabase/service', () => ({ createSupabaseServiceRoleClient: serviceMock }))

import { GET, POST, PUT, PATCH, DELETE } from '@/app/api/admin/events/route'
import { listAdminEvents, updateAdminEvent } from '@/lib/content-repository'

const staff = { ok: true, isStaff: true, user: { id: 'staff-1' } }
const request = (method: string, origin = 'https://pillarsoftech.org') => new Request('https://pillarsoftech.org/api/admin/events?id=workshop', {
  method, headers: { Origin: origin, 'Content-Type': 'application/json' },
  ...(method === 'DELETE' ? {} : { body: JSON.stringify({ action: 'publish' }) }),
})

beforeEach(() => { vi.clearAllMocks(); authMock.mockResolvedValue(staff) })

describe('event admin access and deletion', () => {
  it.each([401, 403])('rejects every event operation without verified staff access (%s)', async (status) => {
    authMock.mockResolvedValue({ ok: false, status, code: status === 401 ? 'unauthenticated' : 'not_staff', message: 'Access denied.' })
    expect((await GET()).status).toBe(status)
    for (const [method, handler] of [['POST', POST], ['PUT', PUT], ['PATCH', PATCH], ['DELETE', DELETE]] as const) {
      expect((await handler(request(method))).status).toBe(status)
    }
    expect(serviceMock).not.toHaveBeenCalled()
  })

  it('rejects cross-origin event mutations', async () => {
    for (const [method, handler] of [['POST', POST], ['PUT', PUT], ['PATCH', PATCH], ['DELETE', DELETE]] as const) {
      expect((await handler(request(method, 'https://outside.example'))).status).toBe(403)
    }
    expect(serviceMock).not.toHaveBeenCalled()
  })

  it('removes events from listings and closes registration while keeping historical rows intact', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'workshop' }, error: null }),
    }
    const from = vi.fn().mockReturnValue(builder)
    serviceMock.mockReturnValue({ from })
    const response = await DELETE(request('DELETE'))
    expect(response.status).toBe(200)
    expect(from).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledWith('events')
    expect(builder.update).toHaveBeenCalledWith({
      deleted_at: expect.any(String), publication_state: 'unpublished', status: 'cancelled',
      participant_registration_state: 'closed', volunteer_registration_state: 'closed', updated_by: 'staff-1',
    })
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('excludes deleted events from admin listings', async () => {
    const builder = { select: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    serviceMock.mockReturnValue({ from: vi.fn().mockReturnValue(builder) })
    expect(await listAdminEvents()).toEqual([])
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('does not edit deleted events', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    serviceMock.mockReturnValue({ from: vi.fn().mockReturnValue(builder) })
    // The repository receives a validated draft in production. Only the lookup matters here.
    await expect(updateAdminEvent('workshop', { title: 'Changed' } as Parameters<typeof updateAdminEvent>[1], 'staff-1')).rejects.toMatchObject({ status: 404 })
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
  })
})
