import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  publicClient: vi.fn(),
  snapshot: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/public', () => ({ createSupabasePublicClient: mocks.publicClient }))
vi.mock('@/lib/event-snapshot', () => ({
  getPublicEventSnapshot: mocks.snapshot,
  toPublicEvent: vi.fn(),
}))

import { ContentRepositoryError, listPublicEvents } from '@/lib/content-repository'

describe('public event fallback safety', () => {
  beforeEach(() => {
    mocks.publicClient.mockReset()
    mocks.snapshot.mockReset()
  })

  it('returns the reviewed snapshot when the database client is unavailable', async () => {
    const snapshot = [{ id: 'snapshot-event', branch: 'ca' }]
    mocks.publicClient.mockReturnValue(null)
    mocks.snapshot.mockReturnValue(snapshot)

    await expect(listPublicEvents()).resolves.toEqual(snapshot)
  })

  it('fails with a 503 instead of treating an empty unavailable snapshot as valid content', async () => {
    mocks.publicClient.mockReturnValue(null)
    mocks.snapshot.mockReturnValue([])

    await expect(listPublicEvents()).rejects.toMatchObject({
      name: 'ContentRepositoryError',
      status: 503,
    } satisfies Partial<ContentRepositoryError>)
  })
})
