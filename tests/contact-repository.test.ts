import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseServiceRoleClientMock } = vi.hoisted(() => ({
  createSupabaseServiceRoleClientMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/service', () => ({ createSupabaseServiceRoleClient: createSupabaseServiceRoleClientMock }))

import { encodeContactCursor } from '@/lib/contact-pagination'
import { listAdminContact } from '@/lib/content-repository'

const cursorId = '00000000-0000-4000-8000-000000000001'
const row = {
  id: cursorId,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'General inquiry',
  school_name: '',
  student_count: '',
  message: 'A question.',
  status: 'new',
  created_at: '2026-08-26T12:00:00.000Z',
  updated_at: '2026-08-26T12:00:00.000Z',
}

function queryClient(data: unknown[] = [row]) {
  const builder = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve, reject),
  }
  for (const method of ['select', 'order', 'limit', 'eq', 'or'] as const) builder[method].mockReturnValue(builder)
  return {
    builder,
    client: { from: vi.fn().mockReturnValue(builder) },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('contact repository pagination', () => {
  it('builds a bounded status/keyset query with delimiter-safe cursor values', async () => {
    const { builder, client } = queryClient([row, { ...row, id: '00000000-0000-4000-8000-000000000002' }])
    createSupabaseServiceRoleClientMock.mockReturnValue(client)
    const cursor = encodeContactCursor('2026-08-26T12:00:00Z', cursorId)

    const result = await listAdminContact({ limit: 1, status: 'new', cursor })

    expect(result.submissions).toHaveLength(1)
    expect(result.nextCursor).toBeTruthy()
    expect(client.from).toHaveBeenCalledWith('contact_submissions')
    expect(builder.select).toHaveBeenCalledWith('id,name,email,message,subject,school_name,student_count,status,created_at,updated_at')
    expect(builder.limit).toHaveBeenCalledWith(2)
    expect(builder.eq).toHaveBeenCalledWith('status', 'new')
    expect(builder.or).toHaveBeenCalledWith(
      `created_at.lt.2026-08-26T12:00:00Z,and(created_at.eq.2026-08-26T12:00:00Z,id.lt.${cursorId})`,
    )
  })

  it('rejects malformed cursors before creating a database client', async () => {
    await expect(listAdminContact({ cursor: 'not-a-cursor' })).rejects.toMatchObject({ status: 400 })
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled()
  })
})
