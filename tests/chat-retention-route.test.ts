import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runMock, clientMock } = vi.hoisted(() => ({
  runMock: vi.fn(),
  clientMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/chat-retention', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chat-retention')>('@/lib/chat-retention')
  return {
    ...actual,
    runChatRetention: runMock,
    createRetentionDiscordClient: clientMock,
  }
})
import { GET, POST } from '@/app/api/cron/chat-retention/route'

const secret = 'retention-secret-012345678901234567890'

function request(method: 'GET' | 'POST', authorization?: string): Request {
  return new Request('https://pillarsoftech.org/api/cron/chat-retention', {
    method,
    headers: authorization ? { authorization } : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  runMock.mockResolvedValue({
    prepared: 0,
    candidates: 0,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    uncertain: 0,
    skipped: 0,
    bounded: false,
    errorCode: null,
  })
})

describe('chat retention cron route authentication', () => {
  it('fails closed when CRON_SECRET is absent or malformed', async () => {
    const missing = await GET(request('GET'))
    expect(missing.status).toBe(503)
    expect(runMock).not.toHaveBeenCalled()

    vi.stubEnv('CRON_SECRET', 'short')
    const short = await GET(request('GET', 'Bearer short'))
    expect(short.status).toBe(503)
    expect(runMock).not.toHaveBeenCalled()
  })

  it('rejects mismatched or malformed authorization before the runner', async () => {
    vi.stubEnv('CRON_SECRET', secret)
    expect((await GET(request('GET', `Bearer wrong-${secret}`))).status).toBe(401)
    expect((await GET(request('GET', `Basic ${secret}`))).status).toBe(401)
    expect(runMock).not.toHaveBeenCalled()
  })

  it('accepts the configured bearer secret for GET and manual POST with no-store', async () => {
    vi.stubEnv('CRON_SECRET', secret)
    vi.stubEnv('DISCORD_GUILD_ID', '900000000000000011')
    vi.stubEnv('DISCORD_CHAT_CHANNEL_ID', '900000000000000012')

    const getResponse = await GET(request('GET', `Bearer ${secret}`))
    expect(getResponse.status).toBe(200)
    expect(getResponse.headers.get('cache-control')).toContain('no-store')
    expect(runMock).toHaveBeenCalledTimes(1)

    const postResponse = await POST(request('POST', `Bearer ${secret}`))
    expect(postResponse.status).toBe(200)
    expect(runMock).toHaveBeenCalledTimes(2)
    expect(clientMock).not.toHaveBeenCalled()
  })
})
