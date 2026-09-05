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
})
