import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { contentErrorResponse } from '@/lib/admin-api'
import { ContentRepositoryError } from '@/lib/content-repository'

describe('content repository error responses', () => {
  it('does not expose raw storage detail for unexpected failures', async () => {
    const response = contentErrorResponse(
      new ContentRepositoryError('postgres relation and constraint detail', 503),
      'Forms could not be saved.',
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Forms could not be saved.' })
  })

  it('preserves safe not-found/conflict statuses without exposing database detail', async () => {
    const notFound = contentErrorResponse(new ContentRepositoryError('postgres detail', 404))
    const conflict = contentErrorResponse(new ContentRepositoryError('postgres detail', 409))
    expect(notFound.status).toBe(404)
    expect(conflict.status).toBe(409)
    await expect(notFound.json()).resolves.toEqual({ error: 'Content operation failed.' })
    await expect(conflict.json()).resolves.toEqual({ error: 'Content operation failed.' })
  })
})
