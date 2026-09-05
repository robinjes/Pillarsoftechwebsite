import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { getChatServerConfig, isChatLiveConfigured } from '@/lib/chat-config'

beforeEach(() => {
  vi.unstubAllEnvs()
})

function stubCompleteConfig() {
  vi.stubEnv('CHAT_ENABLED', 'true')
  vi.stubEnv('CHAT_TOKEN_PEPPER', 'test-pepper')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
  vi.stubEnv('DISCORD_APPLICATION_ID', '100000000000000001')
  vi.stubEnv('DISCORD_PUBLIC_KEY', 'a'.repeat(64))
  vi.stubEnv('DISCORD_BOT_TOKEN', 'bot-token')
  vi.stubEnv('DISCORD_GUILD_ID', '100000000000000002')
  vi.stubEnv('DISCORD_CHAT_CHANNEL_ID', '100000000000000003')
  vi.stubEnv('DISCORD_CHAT_STAFF_ROLE_IDS', '100000000000000004, 100000000000000005')
}

describe('server-only chat readiness gate', () => {
  it('is disabled by default and does not consider Discord fields alone live', () => {
    expect(getChatServerConfig()).toMatchObject({ enabled: false, ready: false, status: 'disabled' })
    expect(isChatLiveConfigured()).toBe(false)
  })

  it('requires every canonical Discord, Supabase, and pepper setting', () => {
    stubCompleteConfig()
    expect(getChatServerConfig()).toMatchObject({ enabled: true, ready: true, status: 'ready' })
    expect(getChatServerConfig().discordStaffRoleIds).toEqual([
      '100000000000000004',
      '100000000000000005',
    ])

    vi.stubEnv('DISCORD_CHAT_CHANNEL_ID', '')
    expect(getChatServerConfig()).toMatchObject({ enabled: true, ready: false, status: 'incomplete' })
  })

  it('rejects malformed IDs and public keys without exposing a configuration detail', () => {
    stubCompleteConfig()
    vi.stubEnv('DISCORD_PUBLIC_KEY', 'not-a-key')
    vi.stubEnv('DISCORD_CHAT_STAFF_ROLE_IDS', 'role-name')
    const config = getChatServerConfig()
    expect(config.ready).toBe(false)
    expect(config.status).toBe('incomplete')
  })
})

