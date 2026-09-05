import { generateKeyPairSync, sign } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { configMock, handlerMock } = vi.hoisted(() => ({
  configMock: vi.fn(),
  handlerMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/chat-config', () => ({ getChatServerConfig: configMock }))
vi.mock('@/lib/chat-discord-interactions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chat-discord-interactions')>('@/lib/chat-discord-interactions')
  return { ...actual, handleVerifiedDiscordInteraction: handlerMock }
})

import { POST } from '@/app/api/integrations/discord/interactions/route'
import { DISCORD_INTERACTION_REQUEST_DEADLINE_MS } from '@/lib/chat-discord-interactions'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const publicKeyHex = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')
const config = {
  enabled: true,
  ready: true,
  credentialReady: true,
  status: 'ready' as const,
  discordApplicationId: '900000000000000010',
  discordPublicKey: publicKeyHex,
  discordBotToken: 'bot-token-for-test',
  discordGuildId: '900000000000000011',
  discordChannelId: '900000000000000012',
  discordStaffRoleIds: ['900000000000000015'],
  discordDeliveryReady: true,
}

function signedRequest(raw: string, timestamp = Math.floor(Date.now() / 1_000)) {
  const timestampHeader = String(timestamp)
  const signature = sign(null, Buffer.concat([Buffer.from(timestampHeader), Buffer.from(raw)]), privateKey).toString('hex')
  return new Request('https://pillarsoftech.org/api/integrations/discord/interactions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-signature-ed25519': signature,
      'x-signature-timestamp': timestampHeader,
    },
    body: raw,
  })
}

function signedStreamRequest(raw: string, stream: ReadableStream<Uint8Array>, timestamp = Math.floor(Date.now() / 1_000)) {
  const timestampHeader = String(timestamp)
  const signature = sign(null, Buffer.concat([Buffer.from(timestampHeader), Buffer.from(raw)]), privateKey).toString('hex')
  return new Request('https://pillarsoftech.org/api/integrations/discord/interactions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-signature-ed25519': signature,
      'x-signature-timestamp': timestampHeader,
    },
    body: stream,
    duplex: 'half',
  } as RequestInit)
}

function validButtonBody(): string {
  return JSON.stringify({
    id: '900000000000000020',
    application_id: config.discordApplicationId,
    type: 3,
    token: 'signed-interaction-token',
    guild_id: config.discordGuildId,
    channel_id: '900000000000000013',
    message: { id: '900000000000000013', channel_id: '900000000000000013', author: { id: config.discordApplicationId, bot: true } },
    member: { user: { id: '900000000000000014' }, roles: ['900000000000000015'] },
    data: { component_type: 2, custom_id: 'pot:v1:close:00000000-0000-4000-8000-000000000001' },
  })
}

describe('Discord interaction POST ingress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configMock.mockReturnValue(config)
    handlerMock.mockResolvedValue({ response: { type: 1 } })
  })

  it('rejects invalid, tampered, and stale signatures before the action handler', async () => {
    const raw = '{"type":1,"application_id":"900000000000000010"}'
    const valid = signedRequest(raw)
    const invalid = new Request(valid, { headers: { 'x-signature-ed25519': '00' } })
    const tampered = signedRequest('{"type":1,"application_id":"900000000000000010" }')
    const stale = signedRequest(raw, Math.floor(Date.now() / 1_000) - 301)

    const invalidResponse = await POST(invalid)
    const tamperedResponse = await POST(new Request(tampered, { body: '{"type":1,"application_id":"900000000000000010"}' }))
    const staleResponse = await POST(stale)

    expect(invalidResponse.status).toBe(401)
    expect(tamperedResponse.status).toBe(401)
    expect(staleResponse.status).toBe(401)
    expect(handlerMock).not.toHaveBeenCalled()
  })

  it('bounds a delayed valid body plus slow authorization from route entry', async () => {
    vi.useFakeTimers()
    try {
      const body = validButtonBody()
      let mutations = 0
      handlerMock.mockImplementation(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 2_200))
        return { response: { type: 5 }, work: async () => { mutations += 1 } }
      })
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode(body))
            controller.close()
          }, 1_000)
        },
      })
      const pending = POST(signedStreamRequest(body, stream))
      await vi.advanceTimersByTimeAsync(1_000)
      await vi.advanceTimersByTimeAsync(1_500)
      const response = await pending

      expect(response.status).toBe(200)
      expect((await response.json()).type).toBe(4)
      expect(mutations).toBe(0)
      expect(handlerMock).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(2_200)
      expect(mutations).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('bounds a never-ending body and invokes nonblocking cancellation', async () => {
    vi.useFakeTimers()
    try {
      let cancelled = false
      const stream = new ReadableStream<Uint8Array>({
        cancel() {
          cancelled = true
          return new Promise<void>(() => undefined)
        },
      })
      const pending = POST(signedStreamRequest(validButtonBody(), stream))
      await vi.advanceTimersByTimeAsync(DISCORD_INTERACTION_REQUEST_DEADLINE_MS)
      const response = await pending

      expect(response.status).toBe(408)
      expect((await response.json()).type).toBe(4)
      expect(cancelled).toBe(true)
      expect(handlerMock).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
