import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  DISCORD_API_V10,
  DISCORD_SUPPRESS_EMBEDS,
  DiscordRestClient,
  DiscordRestError,
} from '@/lib/chat-discord-client'
import {
  chatModerationComponents,
  deliverChatConversation,
  escapeDiscordText,
  stableDiscordNonce,
  type ChatDeliveryDependencies,
} from '@/lib/chat-discord-delivery'
import { ChatDeliveryRepositoryError } from '@/lib/chat-delivery-repository'
import type {
  ChatDeliveryConversation,
  ChatDeliveryMessage,
  ChatDeliveryPart,
  ChatStarterDelivery,
} from '@/lib/chat-delivery-contracts'
import type { ChatServerConfig } from '@/lib/chat-config'

const conversationId = '00000000-0000-4000-8000-000000000001'
const messageId = '00000000-0000-4000-8000-000000000002'
const starterId = '900000000000000001'
const threadMessageId = '900000000000000002'
const applicationId = '900000000000000010'
const guildId = '900000000000000011'
const channelId = '900000000000000012'
const fixedNow = new Date('2026-09-05T12:00:00.000Z')

const config: ChatServerConfig = {
  enabled: false,
  ready: false,
  credentialReady: true,
  discordDeliveryReady: true,
  status: 'disabled',
  discordApplicationId: applicationId,
  discordPublicKey: 'a'.repeat(64),
  discordBotToken: 'test-bot-token',
  discordGuildId: guildId,
  discordChannelId: channelId,
  discordStaffRoleIds: [guildId],
}

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

function channelResponse(archived = false, locked = false): Response {
  return jsonResponse({
    id: starterId,
    guild_id: guildId,
    parent_id: channelId,
    type: 11,
    thread_metadata: { archived, locked },
  })
}

function uuidFor(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
}

function starterFromConversation(conversation: ChatDeliveryConversation): ChatStarterDelivery {
  return {
    conversationId: conversation.id,
    starterMessageId: conversation.discordStarterMessageId,
    starterReference: conversation.discordStarterReference,
    starterNonce: conversation.discordStarterNonce,
    starterState: conversation.discordStarterState,
    claimToken: conversation.discordStarterClaimToken,
    claimExpiresAt: conversation.discordStarterClaimExpiresAt,
    attemptCount: conversation.discordStarterAttemptCount,
    failureCode: conversation.discordStarterFailureCode,
    nextRetryAt: conversation.discordStarterNextRetryAt,
    threadId: conversation.discordThreadId,
    threadLeaseToken: null,
    threadLeaseExpiresAt: null,
  }
}

interface WorkflowOptions {
  starterState?: ChatDeliveryConversation['discordStarterState']
  starterResponse?: () => Response
  threadResponse?: () => Response
  parentHistory?: unknown[]
  body?: string
  hangStarter?: boolean
  unrelatedBacklog?: boolean
}

function makeWorkflow(options: WorkflowOptions = {}) {
  let conversation: ChatDeliveryConversation = {
    id: conversationId,
    status: 'open',
    discordDeliveryStatus: 'pending',
    discordThreadId: null,
    discordStarterMessageId: null,
    discordStarterReference: options.starterState === 'uncertain' ? `chat:${conversationId}:starter` : null,
    discordStarterNonce: options.starterState === 'uncertain' ? stableDiscordNonce(`chat:${conversationId}:starter`) : null,
    discordStarterState: options.starterState ?? 'pending',
    discordStarterClaimToken: null,
    discordStarterClaimExpiresAt: null,
    discordStarterAttemptCount: 0,
    discordStarterFailureCode: null,
    discordStarterNextRetryAt: null,
  }
  const message: ChatDeliveryMessage = {
    id: messageId,
    conversationId,
    sender: 'visitor',
    body: options.body ?? 'A visitor **message** with contact ada@example.com.',
    deliveryStatus: 'pending',
    deliveryPartCount: null,
    createdAt: fixedNow.toISOString(),
  }
  let preparedParts: ChatDeliveryPart[] = []
  const sentPartIds = new Set<string>()
  let threadCreated = false
  let uuidIndex = 100
  const calls: { url: string; method: string; body: Record<string, unknown> | null }[] = []
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    let body: Record<string, unknown> | null = null
    if (typeof init?.body === 'string') body = JSON.parse(init.body) as Record<string, unknown>
    calls.push({ url, method, body })
    const parentMessagesUrl = `${DISCORD_API_V10}/channels/${channelId}/messages`
    const threadUrl = `${DISCORD_API_V10}/channels/${starterId}`
    if (method === 'POST' && url === parentMessagesUrl) {
      if (options.hangStarter) return await new Promise<Response>(() => undefined)
      return options.starterResponse?.() ?? jsonResponse({
        id: starterId,
        content: String(body?.content ?? ''),
        nonce: body?.nonce,
        author: { id: applicationId, bot: true },
      })
    }
    if (method === 'GET' && url.startsWith(`${parentMessagesUrl}?`)) {
      return jsonResponse(options.parentHistory ?? [])
    }
    if (method === 'GET' && url === threadUrl) {
      if (!threadCreated && conversation.discordThreadId === null) return jsonResponse({}, 404)
      return channelResponse()
    }
    if (method === 'POST' && url === `${parentMessagesUrl}/${starterId}/threads`) {
      threadCreated = true
      return channelResponse()
    }
    if (method === 'POST' && url === `${threadUrl}/messages`) {
      return options.threadResponse?.() ?? jsonResponse({
        id: threadMessageId,
        content: String(body?.content ?? ''),
        nonce: body?.nonce,
        author: { id: applicationId, bot: true },
      })
    }
    throw new Error(`unexpected mocked Discord request: ${method} ${url}`)
  })

  const repository = {
    claimChatThreadLease: vi.fn(async () => ({
      conversationId,
      leaseToken: uuidFor(1),
      leaseExpiresAt: new Date(fixedNow.getTime() + 60_000).toISOString(),
    })),
    releaseChatThreadLease: vi.fn(async () => true),
    getChatDeliveryConversation: vi.fn(async () => conversation),
    getFirstChatDeliveryMessage: vi.fn(async () => message),
    getChatDeliveryMessage: vi.fn(async () => message),
    prepareChatStarterDelivery: vi.fn(async (_id: string, _lease: string, reference: string, nonce: string) => {
      conversation = { ...conversation, discordStarterReference: reference, discordStarterNonce: nonce }
      return starterFromConversation(conversation)
    }),
    claimChatStarterDelivery: vi.fn(async (_id: string, _lease: string, claimToken: string) => {
      conversation = {
        ...conversation,
        discordStarterState: 'claimed',
        discordStarterClaimToken: claimToken,
        discordStarterClaimExpiresAt: new Date(fixedNow.getTime() + 60_000).toISOString(),
        discordStarterAttemptCount: conversation.discordStarterAttemptCount + 1,
      }
      return starterFromConversation(conversation)
    }),
    claimUncertainChatStarterDelivery: vi.fn(async (_id: string, _lease: string, claimToken: string) => {
      conversation = {
        ...conversation,
        discordStarterState: 'claimed',
        discordStarterClaimToken: claimToken,
        discordStarterClaimExpiresAt: new Date(fixedNow.getTime() + 60_000).toISOString(),
        discordStarterAttemptCount: conversation.discordStarterAttemptCount + 1,
      }
      return starterFromConversation(conversation)
    }),
    finishChatStarterDelivery: vi.fn(async (_id: string, _lease: string, _claim: string, input: { outcome: string; starterMessageId?: string | null; failureCode?: string | null; nextRetryAt?: string | null }) => {
      conversation = {
        ...conversation,
        discordStarterState: input.outcome as ChatDeliveryConversation['discordStarterState'],
        discordStarterMessageId: input.outcome === 'sent' ? input.starterMessageId ?? null : conversation.discordStarterMessageId,
        discordStarterClaimToken: null,
        discordStarterClaimExpiresAt: null,
        discordStarterFailureCode: input.failureCode ?? null,
        discordStarterNextRetryAt: input.nextRetryAt ?? null,
      }
      return starterFromConversation(conversation)
    }),
    saveChatThreadId: vi.fn(async (_id: string, _lease: string, threadId: string) => {
      conversation = { ...conversation, discordThreadId: threadId }
      return starterFromConversation(conversation)
    }),
    prepareChatMessageParts: vi.fn(async (_id: string, definitions: { partIndex: number; stableReference: string; stableNonce: string }[]) => {
      preparedParts = definitions.map((definition) => ({
        id: uuidFor(200 + definition.partIndex),
        messageId,
        partIndex: definition.partIndex,
        partCount: definitions.length,
        stableReference: definition.stableReference,
        stableNonce: definition.stableNonce,
        discordMessageId: null,
        state: 'pending' as const,
        claimToken: null,
        leaseExpiresAt: null,
        attemptCount: 0,
        failureCode: null,
        nextRetryAt: null,
        createdAt: fixedNow.toISOString(),
        updatedAt: fixedNow.toISOString(),
      }))
      return preparedParts
    }),
    listChatDeliveryWorkCandidates: vi.fn(async () => {
      if (options.unrelatedBacklog) {
        return Array.from({ length: 100 }, (_, index) => ({
          conversationId: uuidFor(600 + index),
          messageId: null,
          partId: null,
          workKind: 'message_prepare' as const,
          state: 'pending',
          attemptCount: 0,
          nextRetryAt: null,
        }))
      }
      if (preparedParts.length === 0) return [{ conversationId, messageId, partId: null, workKind: 'message_prepare' as const, state: 'pending', attemptCount: 0, nextRetryAt: null }]
      const next = preparedParts.find((part) => !sentPartIds.has(part.id))
      if (!next) return []
      return [{ conversationId, messageId, partId: next.id, workKind: 'part' as const, state: 'pending', attemptCount: next.attemptCount, nextRetryAt: null }]
    }),
    listChatDeliveryWorkCandidatesForConversation: vi.fn(async () => {
      if (preparedParts.length === 0) return [{ conversationId, messageId, partId: null, workKind: 'message_prepare' as const, state: 'pending', attemptCount: 0, nextRetryAt: null }]
      const next = preparedParts.find((part) => !sentPartIds.has(part.id))
      if (!next) return []
      return [{ conversationId, messageId, partId: next.id, workKind: 'part' as const, state: 'pending', attemptCount: next.attemptCount, nextRetryAt: null }]
    }),
    claimChatDeliveryPart: vi.fn(async (_id: string, _lease: string, claimToken: string) => {
      const next = preparedParts.find((part) => !sentPartIds.has(part.id))
      if (!next) return null
      return { ...next, state: 'claimed' as const, claimToken, leaseExpiresAt: new Date(fixedNow.getTime() + 60_000).toISOString(), attemptCount: next.attemptCount + 1 }
    }),
    claimUncertainChatDeliveryPart: vi.fn(async () => { throw new Error('not used in normal workflow') }),
    finishChatDeliveryPart: vi.fn(async (_id: string, _lease: string, partId: string, _claim: string, input: { outcome: string; discordMessageId?: string | null; failureCode?: string | null; nextRetryAt?: string | null }) => {
      if (input.outcome === 'sent') sentPartIds.add(partId)
      if (input.outcome === 'failed') conversation = { ...conversation, discordDeliveryStatus: 'failed' }
      else if (input.outcome === 'uncertain') conversation = { ...conversation, discordDeliveryStatus: 'pending' }
      else if (preparedParts.length > 0 && sentPartIds.size === preparedParts.length) conversation = { ...conversation, discordDeliveryStatus: 'sent' }
      return preparedParts.find((part) => part.id === partId) ?? preparedParts[0]!
    }),
  }
  const dependencies: ChatDeliveryDependencies = {
    config,
    fetch: fetcher as unknown as typeof globalThis.fetch,
    now: () => fixedNow,
    uuid: () => uuidFor(uuidIndex++),
    ...(options.hangStarter ? { timeoutMs: 5 } : {}),
    repository,
  }
  return { dependencies, repository, fetcher, calls, message, getConversation: () => conversation }
}

describe('Discord REST client boundaries', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('uses fixed API v10 paths and validates the complete thread relation', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`${DISCORD_API_V10}/channels/${channelId}/messages`)
      expect(init?.method).toBe('POST')
      return jsonResponse({ id: starterId, author: { id: applicationId, bot: true } })
    })
    const client = new DiscordRestClient({ config, fetch: fetcher as unknown as typeof globalThis.fetch })
    await expect(client.sendStarterMessage({
      content: 'starter',
      nonce: stableDiscordNonce('starter'),
      enforceNonce: true,
      allowedMentions: { parse: [] },
      flags: DISCORD_SUPPRESS_EMBEDS,
    })).resolves.toMatchObject({ id: starterId, authorId: applicationId })

    const invalidRelationFetcher = vi.fn(async () => jsonResponse({ id: starterId, type: 11 }))
    const invalidClient = new DiscordRestClient({ config, fetch: invalidRelationFetcher as unknown as typeof globalThis.fetch })
    await expect(invalidClient.startThreadFromMessage(starterId, 'chat')).rejects.toMatchObject({ code: 'discord_relation' })
  })

  it('enforces the dedicated configured bot author during history parsing', async () => {
    const fetcher = vi.fn(async () => jsonResponse([
      { id: starterId, content: '[pot-ref:chat:test]', nonce: null, author: { id: '900000000000000099', bot: true } },
    ]))
    const client = new DiscordRestClient({ config, fetch: fetcher as unknown as typeof globalThis.fetch })
    const messages = await client.listParentMessages()
    expect(messages[0]).toMatchObject({ authorBot: true, authorId: '900000000000000099' })
    expect(client.botAuthorId).toBe(applicationId)
  })

  it('times out response body consumption, not only response headers', async () => {
    const hangingResponse = { status: 200, headers: new Headers(), json: () => new Promise<unknown>(() => undefined) } as unknown as Response
    const fetcher = vi.fn(async () => hangingResponse)
    const client = new DiscordRestClient({ config, timeoutMs: 5, fetch: fetcher as unknown as typeof globalThis.fetch })
    await expect(client.sendStarterMessage({
      content: 'starter',
      nonce: stableDiscordNonce('starter-timeout'),
      enforceNonce: true,
      allowedMentions: { parse: [] },
      flags: DISCORD_SUPPRESS_EMBEDS,
    })).rejects.toMatchObject({ code: 'discord_timeout' })
  })
})

describe('durable Discord delivery bridge', () => {
  it('delivers starter, thread, and visitor parts with redaction and moderation controls', async () => {
    const workflow = makeWorkflow()
    const result = await deliverChatConversation(conversationId, workflow.dependencies)
    expect(result).toMatchObject({ status: 'sent', starterAttempted: true, partsAttempted: 1, partsSent: 1, partsUncertain: 0, partsFailed: 0 })
    const posts = workflow.calls.filter((call) => call.method === 'POST')
    expect(posts).toHaveLength(3)
    const starterBody = posts[0]!.body!
    expect(String(starterBody.content)).not.toContain('ada@example.com')
    expect(starterBody.flags).toBe(DISCORD_SUPPRESS_EMBEDS)
    expect(starterBody.allowed_mentions).toEqual({ parse: [] })
    expect(String(starterBody.nonce)).toHaveLength(24)
    const partBody = posts[2]!.body!
    expect(String(partBody.content)).toContain('[email redacted]')
    expect(String(partBody.content).length).toBeLessThanOrEqual(2_000)
    expect(partBody.flags).toBe(DISCORD_SUPPRESS_EMBEDS)
    expect(partBody.allowed_mentions).toEqual({ parse: [] })
    expect(partBody.components).toEqual([{ type: 1, components: [
      { type: 2, style: 1, label: 'Reply', custom_id: `pot:v1:reply:${conversationId}` },
      { type: 2, style: 2, label: 'Close', custom_id: `pot:v1:close:${conversationId}` },
      { type: 2, style: 4, label: 'Mark spam', custom_id: `pot:v1:spam:${conversationId}` },
    ] }])
    expect(workflow.message.body).toContain('ada@example.com')
  })

  it('does not resend a completed conversation on a duplicate call', async () => {
    const workflow = makeWorkflow()
    await expect(deliverChatConversation(conversationId, workflow.dependencies)).resolves.toMatchObject({ status: 'sent' })
    const postCount = workflow.calls.filter((call) => call.method === 'POST').length
    await expect(deliverChatConversation(conversationId, workflow.dependencies)).resolves.toMatchObject({ status: 'sent', starterAttempted: false, partsAttempted: 0 })
    expect(workflow.calls.filter((call) => call.method === 'POST')).toHaveLength(postCount)
  })

  it('does not starve target work behind an unrelated global backlog', async () => {
    const workflow = makeWorkflow({ unrelatedBacklog: true })
    const result = await deliverChatConversation(conversationId, workflow.dependencies)
    expect(result).toMatchObject({ status: 'sent', partsSent: 1 })
    expect(workflow.repository.listChatDeliveryWorkCandidatesForConversation).toHaveBeenCalled()
    expect(workflow.fetcher).toHaveBeenCalled()
  })

  it('fails closed when a concurrent conversation lease is held', async () => {
    const repository = {
      claimChatThreadLease: vi.fn(async () => { throw new ChatDeliveryRepositoryError('busy', 409, 'delivery_lease_unavailable') }),
    }
    const workflow = makeWorkflow()
    const result = await deliverChatConversation(conversationId, { ...workflow.dependencies, repository })
    expect(result).toMatchObject({ status: 'skipped', failureCode: 'delivery_lease_unavailable' })
    expect(workflow.fetcher).not.toHaveBeenCalled()
  })

  it('records a network timeout or malformed successful POST as uncertain without blind resend', async () => {
    const timeoutWorkflow = makeWorkflow({ hangStarter: true })
    const timeoutResult = await deliverChatConversation(conversationId, timeoutWorkflow.dependencies)
    expect(timeoutResult.status).toBe('uncertain')

    const malformedWorkflow = makeWorkflow({ starterResponse: () => jsonResponse({}) })
    const malformedResult = await deliverChatConversation(conversationId, malformedWorkflow.dependencies)
    expect(malformedResult).toMatchObject({ status: 'uncertain', failureCode: 'discord_malformed' })
    expect(malformedWorkflow.calls.filter((call) => call.method === 'POST')).toHaveLength(1)
  })

  it('reconciles only the configured bot author and never reposts an uncertain starter', async () => {
    const reference = `chat:${conversationId}:starter`
    const workflow = makeWorkflow({
      starterState: 'uncertain',
      parentHistory: [{ id: starterId, content: `[pot-ref:${reference}]`, nonce: stableDiscordNonce(reference), author: { id: applicationId, bot: true } }],
    })
    const result = await deliverChatConversation(conversationId, workflow.dependencies)
    expect(result.status).toBe('sent')
    expect(workflow.calls.filter((call) => call.method === 'POST' && call.url.endsWith(`/channels/${channelId}/messages`))).toHaveLength(0)

    const wrongBot = makeWorkflow({
      starterState: 'uncertain',
      parentHistory: [{ id: starterId, content: `[pot-ref:${reference}]`, nonce: stableDiscordNonce(reference), author: { id: '900000000000000099', bot: true } }],
    })
    const wrongBotResult = await deliverChatConversation(conversationId, wrongBot.dependencies)
    expect(wrongBotResult).toMatchObject({ status: 'uncertain', failureCode: 'discord_reconcile_not_found' })
    expect(wrongBot.calls.filter((call) => call.method === 'POST')).toHaveLength(0)
  })

  it('maps rate limits to a future retry without sleeping', async () => {
    const workflow = makeWorkflow({ starterResponse: () => jsonResponse({ retry_after: 5 }, 429, { 'retry-after': '5' }) })
    const result = await deliverChatConversation(conversationId, workflow.dependencies)
    expect(result).toMatchObject({ status: 'failed', failureCode: 'discord_429', nextRetryAt: '2026-09-05T12:00:05.000Z' })
  })

  it('splits long Unicode content below Discord limits while keeping the stored body unchanged', async () => {
    const workflow = makeWorkflow({ body: `${'😀'.repeat(1_800)} user@example.com` })
    const result = await deliverChatConversation(conversationId, workflow.dependencies)
    expect(result.status).toBe('sent')
    const threadPosts = workflow.calls.filter((call) => call.method === 'POST' && call.url.endsWith(`/channels/${starterId}/messages`))
    expect(threadPosts.length).toBeGreaterThan(1)
    expect(threadPosts.every((call) => String(call.body?.content ?? '').length <= 2_000)).toBe(true)
    expect(threadPosts.every((call) => !String(call.body?.content ?? '').includes('user@example.com'))).toBe(true)
    expect(workflow.message.body).toContain('user@example.com')
  })
})

describe('delivery text contracts', () => {
  it('redacts email, escapes Discord formatting, and keeps nonces/buttons bounded', () => {
    const formatted = escapeDiscordText('**hello** `code` ~quote~ user@example.com')
    expect(formatted).toContain('\\*\\*hello\\*\\*')
    expect(formatted).toContain('[email redacted]')
    expect(stableDiscordNonce('a very long stable reference')).toMatch(/^[A-Za-z0-9_-]{16,25}$/u)
    expect(chatModerationComponents(conversationId)[0]!.components).toHaveLength(3)
  })
})

describe('Discord cleanup and retry-safe errors', () => {
  it('keeps external failures sanitized and never exposes request bodies', async () => {
    const workflow = makeWorkflow({ threadResponse: () => jsonResponse({ error: 'private ada@example.com' }, 400) })
    const result = await deliverChatConversation(conversationId, workflow.dependencies)
    expect(result).toMatchObject({ status: 'failed', failureCode: 'discord_http_4xx' })
    expect(workflow.message.body).toContain('ada@example.com')
    expect(result.failureCode).not.toContain('ada@example.com')
  })

  it('treats cleanup 404s as success and retains retryable failures', async () => {
    const job = {
      id: uuidFor(500),
      conversationId,
      guildId,
      parentChannelId: channelId,
      starterMessageId: starterId,
      threadId: starterId,
      state: 'claimed' as const,
      claimToken: uuidFor(501),
      leaseExpiresAt: new Date(fixedNow.getTime() + 60_000).toISOString(),
      attemptCount: 1,
      failureCode: null,
      nextRetryAt: null,
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString(),
      completedAt: null,
    }
    const notFoundClient = {
      deleteConfiguredThread: vi.fn(async () => { throw new DiscordRestError('discord_not_found', 'not found') }),
      deleteStarterMessage: vi.fn(async () => { throw new DiscordRestError('discord_not_found', 'not found') }),
    }
    const finishCleanupJob = vi.fn(async (_id: string, _claim: string, input: { outcome: string; failureCode?: string | null; nextRetryAt?: string | null }) => ({
      ...job,
      state: input.outcome === 'succeeded' ? 'succeeded' as const : input.outcome === 'uncertain' ? 'uncertain' as const : 'failed' as const,
      failureCode: input.failureCode ?? null,
      nextRetryAt: input.nextRetryAt ?? null,
    }))
    const cleanupRepository = { finishChatCleanupJob: finishCleanupJob }
    const { cleanupDiscordChatJob } = await import('@/lib/chat-discord-delivery')
    const success = await cleanupDiscordChatJob(job, {
      config,
      client: notFoundClient as unknown as DiscordRestClient,
      repository: cleanupRepository,
      now: () => fixedNow,
    })
    expect(success).toMatchObject({ state: 'succeeded', threadDeleted: true, starterDeleted: true })
    expect(finishCleanupJob).toHaveBeenCalledWith(job.id, job.claimToken, { outcome: 'succeeded' })

    const retryClient = {
      deleteConfiguredThread: vi.fn(async () => { throw new DiscordRestError('discord_http_5xx', 'failed') }),
      deleteStarterMessage: vi.fn(),
    }
    const retry = await cleanupDiscordChatJob(job, {
      config,
      client: retryClient as unknown as DiscordRestClient,
      repository: cleanupRepository,
      now: () => fixedNow,
    })
    expect(retry).toMatchObject({ state: 'uncertain', failureCode: 'discord_http_5xx' })
    expect(retryClient.deleteStarterMessage).not.toHaveBeenCalled()
  })
})
