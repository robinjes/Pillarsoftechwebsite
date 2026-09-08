import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/supabase/config', () => ({
  getSupabasePublicConfig: () => ({ url: 'https://example.supabase.co', anonKey: 'anon-key' }),
}))

import { createSupabasePublicClient } from '@/lib/supabase/public'

describe('public content Supabase client', () => {
  it('is anonymous and cannot vary by request cookies/session state', () => {
    const client = {} as ReturnType<typeof createSupabasePublicClient>
    mocks.createClient.mockReturnValueOnce(client)

    expect(createSupabasePublicClient()).toBe(client)
    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    )
  })
})
