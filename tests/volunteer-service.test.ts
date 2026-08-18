import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

import { VolunteerApiError, volunteerService } from '@/lib/volunteerService'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('volunteerService route client', () => {
  it('loads the verified /api/me DTO and does not infer staff from email', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      profile: {
        id: 'user-1', name: 'Staff Helper', email: 'staff-helper@example.test',
        memberCode: 'POT-123456', createdAt: '2026-08-18T00:00:00.000Z', totalHours: 3,
        isStaff: false, role: 'volunteer',
      },
    }))
    globalThis.fetch = fetchMock
    await expect(volunteerService.getCurrentUser()).resolves.toMatchObject({
      id: 'user-1', fullName: 'Staff Helper', role: 'volunteer', totalHours: 3,
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/me', { cache: 'no-store' })
  })

  it('sends only the event envelope through the registration route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      registration: {
        id: 'registration-1', userId: 'user-1', eventId: 'event-1', eventTitle: 'Event',
        status: 'registered', hours: 0, createdAt: '2026-08-18T00:00:00.000Z',
      },
    }, 201))
    globalThis.fetch = fetchMock
    await volunteerService.registerForEvent('event-1')
    expect(fetchMock).toHaveBeenCalledWith('/api/volunteer/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ eventId: 'event-1' }),
    }))
  })

  it('preserves safe status errors instead of swallowing authorization failures', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'not_authorized', message: 'Staff access required.' }, 403))
    await expect(volunteerService.getAllProfiles()).rejects.toEqual(expect.objectContaining({
      name: 'VolunteerApiError', status: 403, code: 'not_authorized',
    } satisfies Partial<VolunteerApiError>))
  })
})
