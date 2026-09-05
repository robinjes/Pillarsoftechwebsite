import { generateKeyPairSync, sign } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  DISCORD_INTERACTION_AUTH_DEADLINE_MS,
  handleVerifiedDiscordInteraction,
  parseDiscordInteractionBody,
  readBoundedRequestBytes,
  verifyDiscordInteractionSignature,
  type DiscordInteractionDependencies,
} from '@/lib/chat-discord-interactions'
import {
  chatAdminMessageSchema,
  chatAdminReplySchema,
  chatAdminTerminalSchema,
} from '@/lib/chat-admin-contracts'
import { isIndependentlyAuthenticatedPath } from '@/middleware'
import type { ChatServerConfig } from '@/lib/chat-config'

const conversationId = '00000000-0000-4000-8000-000000000001'
const actorUserId = '00000000-0000-4000-8000-000000000010'
const applicationId = '900000000000000010'
const guildId = '900000000000000011'
const parentChannelId = '900000000000000012'
const starterId = '900000000000000013'
const actorId = '900000000000000014'
const staffRoleId = '900000000000000015'
const fixedConfig: ChatServerConfig = {
  enabled: true,
  ready: true,
  credentialReady: true,
  status: 'ready',
  discordApplicationId: applicationId,
  discordPublicKey: 'a'.repeat(64),
  discordBotToken: 'bot-token-for-test',
  discordGuildId: guildId,
  discordChannelId: parentChannelId,
  discordStaffRoleIds: [staffRoleId],
  discordDeliveryReady: true,
}

function conversation() {
  return {
    id: conversationId,
    status: 'open' as const,
    discordThreadId: starterId,
    discordStarterMessageId: starterId,
  }
}

function relationFetcher() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'PATCH' && url.includes('/webhooks/')) return new Response('{}', { status: 200 })
    if (url.endsWith(`/channels/${starterId}`)) {
      return new Response(JSON.stringify({
        id: starterId,
        guild_id: guildId,
        parent_id: parentChannelId,
        type: 11,
        thread_metadata: { archived: false, locked: false },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error(`unexpected test request ${url}`)
  })
}

function basePayload(type: number, data: Record<string, unknown>, channelId = starterId) {
  return {
    id: '900000000000000020',
    application_id: applicationId,
    type,
    token: 'signed-interaction-token',
    guild_id: guildId,
    channel_id: channelId,
    message: { id: starterId, channel_id: channelId, author: { id: applicationId, bot: true } },
    member: { user: { id: actorId }, roles: [staffRoleId] },
    data,
  }
}

function dependencies(overrides: Partial<DiscordInteractionDependencies> = {}): DiscordInteractionDependencies {
  return {
    config: fixedConfig,
    fetch: relationFetcher() as unknown as typeof globalThis.fetch,
    authorization: {
      lookupStaffUser: vi.fn().mockResolvedValue(actorUserId),
      getConversation: vi.fn().mockResolvedValue(conversation()),
    },
    actions: {
      reply: vi.fn().mockResolvedValue({ conversationId, id: '00000000-0000-4000-8000-000000000099' }),
      terminal: vi.fn().mockResolvedValue({}),
      queue: vi.fn().mockResolvedValue({}),
      deliver: vi.fn().mockResolvedValue({ status: 'sent' }),
    } as unknown as DiscordInteractionDependencies['actions'],
    ...overrides,
  }
}

describe('signed Discord interaction boundaries', () => {
  it('verifies the exact raw bytes and rejects tampering, stale, and future timestamps', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const raw = Buffer.from('{"type":1,"application_id":"900000000000000010"}')
    const timestamp = '1800000000'
    const signature = sign(null, Buffer.concat([Buffer.from(timestamp), raw]), privateKey).toString('hex')
    const publicKeyHex = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')

    expect(verifyDiscordInteractionSignature(raw, signature, timestamp, publicKeyHex, Number(timestamp))).toBe('valid')
    expect(verifyDiscordInteractionSignature(Buffer.from(`${raw} `), signature, timestamp, publicKeyHex, Number(timestamp))).toBe('invalid')
    expect(verifyDiscordInteractionSignature(raw, signature, String(Number(timestamp) - 301), publicKeyHex, Number(timestamp))).toBe('stale')
    expect(verifyDiscordInteractionSignature(raw, signature, String(Number(timestamp) + 301), publicKeyHex, Number(timestamp))).toBe('stale')
    expect(parseDiscordInteractionBody(raw)).toMatchObject({ type: 1 })
  })

  it('bounds raw request bytes before JSON parsing', async () => {
    const oversized = new Request('https://pillarsoftech.org/api/integrations/discord/interactions', {
      method: 'POST',
      headers: { 'content-length': '10' },
      body: '01234567890',
    })
    await expect(readBoundedRequestBytes(oversized, 10)).resolves.toBeNull()
  })

  it('rejects server-only actor/source fields from browser DTOs', () => {
    expect(chatAdminReplySchema.safeParse({
      conversationId,
      staffMessageId: '00000000-0000-4000-8000-000000000002',
      body: 'Reply',
      sourceInteractionId: '900000000000000021',
    }).success).toBe(false)
    expect(chatAdminTerminalSchema.safeParse({
      conversationId,
      status: 'closed',
      actionId: 'admin-action',
      discordActorId: actorId,
    }).success).toBe(false)
    expect(chatAdminMessageSchema.safeParse({
      id: conversationId,
      conversationId,
      sender: 'staff',
      body: 'Reply',
      deliveryStatus: 'pending',
      createdAt: '2026-09-05T12:00:00.000Z',
      authorUserId: actorUserId,
    }).success).toBe(false)
  })

  it('responds with a modal for an authorized parent starter button and accepts its parent-origin submission', async () => {
    const deps = dependencies()
    const button = await handleVerifiedDiscordInteraction(basePayload(3, {
      component_type: 2,
      custom_id: `pot:v1:reply:${conversationId}`,
    }, parentChannelId), deps)
    expect(button.response.type).toBe(9)
    const customId = String(button.response.data?.custom_id)
    expect(customId).toMatch(new RegExp(`^pot:v1:reply-modal:${conversationId}:900000000000000020:starter$`))
    expect(customId.length).toBeLessThanOrEqual(100)

    const modal = await handleVerifiedDiscordInteraction({
      ...basePayload(5, {
        custom_id: customId,
        components: [{ type: 1, components: [{ type: 4, custom_id: 'body', value: 'A reply' }] }],
      }, parentChannelId),
      id: '900000000000000022',
    }, deps)
    expect(modal.response.type).toBe(5)
    await modal.work?.()
    expect(deps.actions?.reply).toHaveBeenCalledWith(expect.objectContaining({ conversationId, body: 'A reply' }), actorUserId, expect.objectContaining({
      sourceInteractionId: '900000000000000022',
      discordActorId: actorId,
    }))
  })

  it('reports website-save and Discord relay states separately, including delivery throws', async () => {
    const cases: Array<{ label: string; delivery: 'sent' | 'failed' | 'throw'; content: string }> = [
      { label: 'sent', delivery: 'sent', content: 'Reply saved on the website and relayed to Discord.' },
      { label: 'failed', delivery: 'failed', content: 'Reply saved on the website. Discord relay is pending or needs retry.' },
      { label: 'throw', delivery: 'throw', content: 'Reply saved on the website. Discord relay is pending or needs retry.' },
    ]
    for (const testCase of cases) {
      const deps = dependencies()
      const patchBodies: string[] = []
      const originalFetch = deps.fetch!
      deps.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'PATCH') patchBodies.push(String(init.body))
        return originalFetch(input, init)
      }) as unknown as typeof globalThis.fetch
      if (!deps.actions) throw new Error('test actions are missing')
      deps.actions.deliver = testCase.delivery === 'throw'
        ? vi.fn().mockRejectedValue(new Error('delivery unavailable'))
        : vi.fn().mockResolvedValue({ status: testCase.delivery })

      const modal = await handleVerifiedDiscordInteraction({
        ...basePayload(5, {
          custom_id: `pot:v1:reply-modal:${conversationId}:900000000000000020:thread`,
          components: [{ type: 1, components: [{ type: 4, custom_id: 'body', value: 'Saved reply' }] }],
        }),
        id: '900000000000000022',
      }, deps)
      await modal.work?.()

      const completion = JSON.parse(patchBodies.at(-1) ?? '{}') as { content?: string }
      expect(completion.content, testCase.label).toBe(testCase.content)
      expect(completion.content, testCase.label).not.toContain('could not be saved')
      expect(deps.actions?.reply, testCase.label).toHaveBeenCalled()
    }
  })

  it('returns a deferred response for terminal actions and does not mutate for denied mappings', async () => {
    const deps = dependencies()
    const close = await handleVerifiedDiscordInteraction(basePayload(3, {
      component_type: 2,
      custom_id: `pot:v1:close:${conversationId}`,
    }), deps)
    expect(close.response.type).toBe(5)
    await close.work?.()
    expect(deps.actions?.terminal).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed' }), actorUserId, expect.objectContaining({ discordActorId: actorId }))

    const denied = dependencies({
      authorization: {
        lookupStaffUser: vi.fn().mockResolvedValue(null),
        getConversation: vi.fn().mockResolvedValue(conversation()),
      },
    })
    const deniedResponse = await handleVerifiedDiscordInteraction(basePayload(3, {
      component_type: 2,
      custom_id: `pot:v1:spam:${conversationId}`,
    }), denied)
    expect(deniedResponse.response.type).toBe(4)
    expect(deniedResponse.response.data?.content).toBe('This action is not authorized.')
    expect(deniedResponse.work).toBeUndefined()
    expect(denied.actions?.terminal).not.toHaveBeenCalled()
  })

  it('rejects every Discord binding before mutation for wrong app, guild, relation, role, or mapping', async () => {
    const cases: Array<{ name: string; payload: Record<string, unknown>; deps?: DiscordInteractionDependencies; explicitDenied?: boolean }> = [
      {
        name: 'wrong application',
        payload: { ...basePayload(3, { component_type: 2, custom_id: `pot:v1:close:${conversationId}` }), application_id: '900000000000000099' },
      },
      {
        name: 'wrong guild',
        payload: { ...basePayload(3, { component_type: 2, custom_id: `pot:v1:close:${conversationId}` }), guild_id: '900000000000000099' },
      },
      {
        name: 'wrong thread and parent relation',
        payload: {
          ...basePayload(3, { component_type: 2, custom_id: `pot:v1:close:${conversationId}` }, '900000000000000099'),
          message: { id: '900000000000000098', channel_id: '900000000000000099', author: { id: applicationId, bot: true } },
        },
      },
      {
        name: 'stored thread has the wrong parent',
        payload: basePayload(3, { component_type: 2, custom_id: `pot:v1:close:${conversationId}` }),
        deps: dependencies({
          fetch: vi.fn(async () => new Response(JSON.stringify({ id: starterId, guild_id: guildId, parent_id: '900000000000000099', type: 11 }), { status: 200 })) as unknown as typeof globalThis.fetch,
        }),
      },
      {
        name: 'missing allowed role',
        payload: { ...basePayload(3, { component_type: 2, custom_id: `pot:v1:close:${conversationId}` }), member: { user: { id: actorId }, roles: [] } },
        explicitDenied: true,
      },
      {
        name: 'inactive mapping',
        payload: basePayload(3, { component_type: 2, custom_id: `pot:v1:close:${conversationId}` }),
        deps: dependencies({
          authorization: {
            lookupStaffUser: vi.fn().mockResolvedValue(null),
            getConversation: vi.fn().mockResolvedValue(conversation()),
          },
        }),
        explicitDenied: true,
      },
      {
        name: 'unmapped nonstaff actor',
        payload: { ...basePayload(3, { component_type: 2, custom_id: `pot:v1:close:${conversationId}` }), member: { user: { id: '900000000000000099' }, roles: [staffRoleId] } },
        deps: dependencies({
          authorization: {
            lookupStaffUser: vi.fn().mockResolvedValue(null),
            getConversation: vi.fn().mockResolvedValue(conversation()),
          },
        }),
        explicitDenied: true,
      },
    ]

    for (const testCase of cases) {
      const deps = testCase.deps ?? dependencies()
      const result = await handleVerifiedDiscordInteraction(testCase.payload, deps)
      expect(result.response.type, testCase.name).toBe(4)
      if (testCase.explicitDenied) expect(result.response.data?.content, testCase.name).toBe('This action is not authorized.')
      expect(result.work, testCase.name).toBeUndefined()
      expect(deps.actions?.reply, testCase.name).not.toHaveBeenCalled()
      expect(deps.actions?.terminal, testCase.name).not.toHaveBeenCalled()
      expect(deps.actions?.queue, testCase.name).not.toHaveBeenCalled()
    }
  })

  it('rejects HTML and over-limit modal text before any deferred work', async () => {
    const modalCustomId = `pot:v1:reply-modal:${conversationId}:900000000000000020:thread`
    for (const value of ['<b>not plain text</b>', 'x'.repeat(4_001)]) {
      const deps = dependencies()
      const result = await handleVerifiedDiscordInteraction({
        ...basePayload(5, {
          custom_id: modalCustomId,
          components: [{ type: 1, components: [{ type: 4, custom_id: 'body', value }] }],
        }),
        id: '900000000000000021',
      }, deps)
      expect(result.response.type).toBe(4)
      expect(result.work).toBeUndefined()
      expect(deps.actions?.reply).not.toHaveBeenCalled()
    }
  })

  it('accepts only the registered /chat-queue open and close subcommands', async () => {
    for (const [name, queueOpen] of [['open', true], ['close', false]] as const) {
      const deps = dependencies()
      const result = await handleVerifiedDiscordInteraction(basePayload(2, {
        name: 'chat-queue',
        options: [{ type: 1, name }],
      }, parentChannelId), deps)
      expect(result.response.type).toBe(5)
      await result.work?.()
      expect(deps.actions?.queue).toHaveBeenCalledWith(expect.objectContaining({ queueOpen }), actorUserId, expect.objectContaining({ discordActorId: actorId }))
    }

    for (const data of [
      { name: 'queue', options: [{ type: 1, name: 'open' }] },
      { name: 'chat-queue', options: [{ type: 5, name: 'open', value: true }] },
      { name: 'chat-queue', options: [{ type: 1, name: 'open', options: [{ type: 1, name: 'nested' }] }] },
    ]) {
      const deps = dependencies()
      const result = await handleVerifiedDiscordInteraction(basePayload(2, data, parentChannelId), deps)
      expect(result.response.type).toBe(4)
      expect(result.work).toBeUndefined()
      expect(deps.actions?.queue).not.toHaveBeenCalled()
    }
  })

  it('replays a modal with the same source interaction binding for the receipt RPC', async () => {
    const deps = dependencies()
    const button = await handleVerifiedDiscordInteraction(basePayload(3, {
      component_type: 2,
      custom_id: `pot:v1:reply:${conversationId}`,
    }), deps)
    const customId = String(button.response.data?.custom_id)
    const modalPayload = {
      ...basePayload(5, {
        custom_id: customId,
        components: [{ type: 1, components: [{ type: 4, custom_id: 'body', value: 'same reply' }] }],
      }),
      id: '900000000000000021',
    }
    const first = await handleVerifiedDiscordInteraction(modalPayload, deps)
    const second = await handleVerifiedDiscordInteraction(modalPayload, deps)
    await first.work?.()
    await second.work?.()
    const calls = vi.mocked(deps.actions!.reply).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0]?.[2]).toEqual(calls[1]?.[2])
    expect(calls[0]?.[2]).toMatchObject({ sourceInteractionId: '900000000000000021', discordActorId: actorId })
  })

  it('keeps slow pre-ack conversation authorization bounded and rejects a signed PING for another application', async () => {
    const slow = dependencies({
      authorization: {
        lookupStaffUser: vi.fn().mockResolvedValue(actorUserId),
        getConversation: vi.fn(() => new Promise<null>(() => undefined)),
      },
    })
    const started = Date.now()
    const response = await handleVerifiedDiscordInteraction(basePayload(3, {
      component_type: 2,
      custom_id: `pot:v1:reply:${conversationId}`,
    }), slow)
    expect(Date.now() - started).toBeLessThan(DISCORD_INTERACTION_AUTH_DEADLINE_MS + 500)
    expect(response.response.type).toBe(4)

    const wrongPing = await handleVerifiedDiscordInteraction({
      id: '900000000000000023',
      application_id: '900000000000000099',
      type: 1,
    }, dependencies())
    expect(wrongPing.response.type).toBe(4)
  })

  it('keeps the middleware bypass exact and does not broaden it to admin or retention paths', () => {
    expect(isIndependentlyAuthenticatedPath('/api/integrations/discord/interactions')).toBe(true)
    expect(isIndependentlyAuthenticatedPath('/api/integrations/discord/interactions/extra')).toBe(false)
    expect(isIndependentlyAuthenticatedPath('/api/admin/chats')).toBe(false)
  })
})
