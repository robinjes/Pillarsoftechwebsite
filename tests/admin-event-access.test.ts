import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, serviceMock } = vi.hoisted(() => ({ authMock: vi.fn(), serviceMock: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: authMock }))
vi.mock('@/lib/supabase/service', () => ({ createSupabaseServiceRoleClient: serviceMock }))

import { GET, POST, PUT, PATCH, DELETE } from '@/app/api/admin/events/route'
import { eventFromRow, listAdminEvents, updateAdminEvent } from '@/lib/content-repository'

const eventRow = {
  id: 'workshop', slug: 'workshop', branch: 'ca', title: 'Workshop',
  summary: '', description: '', starts_at: null, ends_at: null,
  timezone: 'America/Los_Angeles', start_label: '', end_label: '', location: '',
  program_category: 'general', status: 'upcoming', media: {}, resources: {},
  participant_registration_state: 'closed', volunteer_registration_state: 'closed',
  participant_capacity: null, volunteer_capacity: null, outcomes: {}, publication_state: 'unpublished',
}
const missingColumn = { code: '42703', message: 'column events.deleted_at does not exist' }

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

  it('loads events on the schema that predates soft deletion', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn })
        .mockResolvedValueOnce({ data: [eventRow], error: null }),
    }
    serviceMock.mockReturnValue({ from: vi.fn().mockReturnValue(builder) })
    const response = await GET()
    expect(response.status).toBe(200)
    expect((await response.json()).events[0].id).toBe('workshop')
    expect(builder.order).toHaveBeenCalledTimes(2)
    expect(builder.is).toHaveBeenCalledTimes(1)
  })

  it('saves edited event content on the schema that predates soft deletion', async () => {
    const changed = { ...eventRow, title: 'Updated workshop' }
    const builder = {
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn })
        .mockResolvedValueOnce({ data: changed, error: null }),
    }
    serviceMock.mockReturnValue({ from: vi.fn().mockReturnValue(builder) })
    const response = await PUT(new Request('https://pillarsoftech.org/api/admin/events?id=workshop', {
      method: 'PUT', headers: { Origin: 'https://pillarsoftech.org', 'Content-Type': 'application/json' },
      body: JSON.stringify(eventFromRow(changed)),
    }))
    expect(response.status).toBe(200)
    expect((await response.json()).event.title).toBe('Updated workshop')
    expect(builder.update).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Updated workshop', updated_by: 'staff-1' }))
    expect(builder.is).toHaveBeenCalledTimes(1)
  })

  it('publishes events on the schema that predates soft deletion', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: missingColumn })
        .mockResolvedValueOnce({ data: { status: 'draft' }, error: null })
        .mockResolvedValueOnce({ data: null, error: missingColumn })
        .mockResolvedValueOnce({ data: { ...eventRow, publication_state: 'published' }, error: null }),
    }
    serviceMock.mockReturnValue({ from: vi.fn().mockReturnValue(builder) })
    const response = await PATCH(request('PATCH'))
    expect(response.status).toBe(200)
    expect((await response.json()).event.publicationState).toBe('published')
    expect(builder.update).toHaveBeenLastCalledWith({ publication_state: 'published', status: 'upcoming', updated_by: 'staff-1' })
    expect(builder.is).toHaveBeenCalledTimes(2)
  })

  it.each([
    { code: '42501', message: 'permission denied' },
    { code: '42703', message: 'column events.branch does not exist' },
    { code: 'PGRST204', message: 'deleted_at is not present in the schema cache' },
  ])('does not bypass deletion filtering for unrelated database failures ($code)', async (error) => {
    const builder = { select: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: null, error }) }
    serviceMock.mockReturnValue({ from: vi.fn().mockReturnValue(builder) })
    expect((await GET()).status).toBe(503)
    expect(builder.order).toHaveBeenCalledTimes(1)
  })

  it.each([missingColumn, { code: 'PGRST204', message: 'deleted_at is not present in the schema cache' }])('explains the migration requirement when deletion is unavailable ($code)', async (error) => {
    const builder = {
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error }),
    }
    const from = vi.fn().mockReturnValue(builder)
    serviceMock.mockReturnValue({ from })
    const response = await DELETE(request('DELETE'))
    expect(response.status).toBe(503)
    expect((await response.json()).error).toContain('202610100001_event_deletion.sql')
    expect(from).toHaveBeenCalledTimes(1)
  })
})
