import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { getProfile, listOwnRegistrations } from '@/lib/volunteer-server'

type QueryResult = { data: unknown; error: { message?: string } | null }

function profileClient(results: QueryResult[], insertError: { message?: string } | null = null) {
  let readIndex = 0
  const selectedColumns: string[] = []
  const insertPayloads: Record<string, unknown>[] = []

  const from = vi.fn((table: string) => {
    if (table !== 'profiles') throw new Error(`unexpected table ${table}`)
    const query = {
      select: vi.fn((columns: string) => {
        selectedColumns.push(columns)
        return query
      }),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => results[readIndex++] || { data: null, error: { message: 'missing test result' } }),
      insert: vi.fn(async (payload: Record<string, unknown>) => {
        insertPayloads.push(payload)
        return { data: null, error: insertError }
      }),
    }
    return query
  })

  return {
    client: { from, auth: { getUser: vi.fn() } },
    selectedColumns,
    insertPayloads,
  }
}

describe('legacy volunteer compatibility', () => {
  it('maps legacy profiles with zero hours and never trusts the legacy role column', async () => {
    const legacy = profileClient([
      { data: null, error: { message: 'column profiles.total_hours does not exist' } },
      {
        data: {
          id: 'user-1',
          full_name: 'Legacy Volunteer',
          email: 'volunteer@example.test',
          member_code: 'POT-123456',
          role: 'staff',
          created_at: '2026-08-18T00:00:00.000Z',
        },
        error: null,
      },
    ])

    const profile = await getProfile(legacy.client as never, 'user-1', false)

    expect(profile).toMatchObject({
      id: 'user-1',
      name: 'Legacy Volunteer',
      totalHours: 0,
      role: 'volunteer',
      isStaff: false,
    })
    expect(legacy.selectedColumns).toEqual([
      'id,full_name,email,member_code,created_at,total_hours',
      'id,full_name,email,member_code,created_at',
    ])
    expect(legacy.selectedColumns.join(',')).not.toContain('role')
  })

  it('creates a missing profile with bounded verified identity and no client-controlled role', async () => {
    const missing = profileClient([
      { data: null, error: { message: 'column profiles.total_hours does not exist' } },
      { data: null, error: null },
      {
        data: {
          id: 'user-2',
          full_name: 'Verified Name',
          email: 'verified@example.test',
          member_code: 'POT-ABCDEF1234567890',
          created_at: '2026-08-18T00:00:00.000Z',
        },
        error: null,
      },
    ])

    const profile = await getProfile(missing.client as never, 'user-2', false, {
      id: 'user-2',
      email: `verified@example.test${'x'.repeat(400)}`,
      user_metadata: { full_name: `Verified Name${'x'.repeat(400)}`, role: 'staff' },
    })

    const payload = missing.insertPayloads[0]
    expect(payload).toBeDefined()
    expect(payload).toMatchObject({ id: 'user-2' })
    expect(payload).not.toHaveProperty('role')
    expect(String(payload.full_name).length).toBeLessThanOrEqual(160)
    expect(String(payload.email).length).toBeLessThanOrEqual(320)
    expect(payload.member_code).toMatch(/^POT-[A-F0-9]{16}$/)
    expect(profile).toMatchObject({ id: 'user-2', totalHours: 0, role: 'volunteer' })
  })

  it('falls back from blank full_name metadata to the provider name', async () => {
    const missing = profileClient([
      { data: null, error: { message: 'column profiles.total_hours does not exist' } },
      { data: null, error: null },
      {
        data: {
          id: 'user-4',
          full_name: 'Provider Name',
          email: 'provider@example.test',
          member_code: 'POT-ABCDEF1234567890',
          created_at: '2026-08-18T00:00:00.000Z',
        },
        error: null,
      },
    ])

    await getProfile(missing.client as never, 'user-4', false, {
      id: 'user-4',
      email: 'provider@example.test',
      user_metadata: { full_name: '   ', name: 'Provider Name' },
    })

    expect(missing.insertPayloads[0]).toMatchObject({ full_name: 'Provider Name' })
  })

  it('re-reads a profile created by a concurrent signup after a losing insert', async () => {
    const race = profileClient([
      { data: null, error: { message: 'column profiles.total_hours does not exist' } },
      { data: null, error: null },
      { data: null, error: { message: 'column profiles.total_hours does not exist' } },
      {
        data: {
          id: 'user-5',
          full_name: 'Concurrent Volunteer',
          email: 'concurrent@example.test',
          member_code: 'POT-ABCDEF1234567890',
          role: 'staff',
          created_at: '2026-08-18T00:00:00.000Z',
        },
        error: null,
      },
    ], { message: 'duplicate key value violates unique constraint' })

    await expect(getProfile(race.client as never, 'user-5', false, {
      id: 'user-5',
      email: 'concurrent@example.test',
      user_metadata: { name: 'Concurrent Volunteer' },
    })).resolves.toMatchObject({
      id: 'user-5',
      totalHours: 0,
      role: 'volunteer',
      isStaff: false,
    })
    expect(race.insertPayloads).toHaveLength(1)
  })

  it('falls back to own legacy event history and uses stored event titles', async () => {
    const userId = 'user-3'
    const modernQuery = {
      select: vi.fn(() => modernQuery),
      eq: vi.fn(() => modernQuery),
      order: vi.fn(() => modernQuery),
    }
    modernQuery.order = vi.fn(async () => ({
      data: null,
      error: { message: 'relation volunteer_registrations does not exist' },
    })) as never

    const legacyQuery = {
      select: vi.fn(() => legacyQuery),
      eq: vi.fn((column: string, value: string) => {
        expect(column).toBe('user_id')
        expect(value).toBe(userId)
        return legacyQuery
      }),
      order: vi.fn(async () => ({
        data: [{
          id: 'signup-1',
          user_id: userId,
          event_id: 'career-panel',
          event_title: 'Career Panel',
          status: 'attended',
          hours: 2,
          created_at: '2026-08-17T00:00:00.000Z',
        }],
        error: null,
      })),
    }
    const client = {
      from: vi.fn((table: string) => table === 'volunteer_registrations' ? modernQuery : legacyQuery),
    }

    await expect(listOwnRegistrations(client as never, userId)).resolves.toEqual([{
      id: 'signup-1',
      userId,
      eventId: 'career-panel',
      eventTitle: 'Career Panel',
      status: 'attended',
      hours: 2,
      createdAt: '2026-08-17T00:00:00.000Z',
    }])
  })
})
