import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseServiceRoleClientMock, rpcMock } = vi.hoisted(() => ({
  createSupabaseServiceRoleClientMock: vi.fn(),
  rpcMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/service', () => ({ createSupabaseServiceRoleClient: createSupabaseServiceRoleClientMock }))

import { allowContactAttemptDurably, DurableRateLimitError } from '@/lib/contact-rate-limit'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CHAT_TOKEN_PEPPER', 'test-pepper')
  rpcMock.mockResolvedValue({ data: true, error: null })
  createSupabaseServiceRoleClientMock.mockReturnValue({ rpc: rpcMock })
})

describe('durable contact rate limiter', () => {
  it('fails closed when the HMAC pepper is missing', async () => {
    vi.stubEnv('CHAT_TOKEN_PEPPER', '')
    await expect(allowContactAttemptDurably('203.0.113.10')).rejects.toBeInstanceOf(DurableRateLimitError)
    expect(createSupabaseServiceRoleClientMock).not.toHaveBeenCalled()
  })

  it('passes only a scoped HMAC digest to the shared RPC and returns denial', async () => {
    rpcMock.mockResolvedValueOnce({ data: false, error: null })
    await expect(allowContactAttemptDurably(' 203.0.113.10 ')).resolves.toBe(false)
    expect(rpcMock).toHaveBeenCalledWith('consume_chat_rate_limit', {
      p_bucket_key: expect.stringMatching(/^contact:[0-9a-f]{64}$/),
      p_window_seconds: 600,
      p_max_attempts: 5,
    })
    expect(JSON.stringify(rpcMock.mock.calls)).not.toContain('203.0.113.10')
  })

  it('fails closed when the RPC returns an error or malformed result', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'database detail' } })
    await expect(allowContactAttemptDurably('client-a')).rejects.toBeInstanceOf(DurableRateLimitError)
    rpcMock.mockResolvedValueOnce({ data: 'true', error: null })
    await expect(allowContactAttemptDurably('client-a')).rejects.toBeInstanceOf(DurableRateLimitError)
  })
})
