import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import {
  DISCORD_HISTORY_PAGE_SIZE,
  DISCORD_MAX_CONTENT_LENGTH,
  DISCORD_MAX_HISTORY_PAGES,
  DISCORD_SUPPRESS_EMBEDS,
  DiscordRestClient,
  DiscordRestError,
  createDiscordRestClient,
  type DiscordComponentRow,
  type DiscordMessage,
} from '@/lib/chat-discord-client'
import { getChatServerConfig, type ChatServerConfig } from '@/lib/chat-config'
import {
  chatDeliveryMessageSchema,
  type ChatCleanupJob,
  type ChatDeliveryConversation,
  type ChatDeliveryMessage,
  type ChatDeliveryPart,
  type ChatDeliveryWorkCandidate,
} from '@/lib/chat-delivery-contracts'
import {
  claimChatCleanupJob,
  claimChatDeliveryPart,
  claimChatStarterDelivery,
  claimChatThreadLease,
  claimUncertainChatCleanupJob,
  claimUncertainChatDeliveryPart,
  claimUncertainChatStarterDelivery,
  finishChatCleanupJob,
  finishChatDeliveryPart,
  finishChatStarterDelivery,
  getChatDeliveryConversation,
  getChatDeliveryMessage,
  getFirstChatDeliveryMessage,
  listChatDeliveryWorkCandidates,
  listChatDeliveryWorkCandidatesForConversation,
  prepareChatMessageParts,
  prepareChatStarterDelivery,
  releaseChatThreadLease,
  saveChatThreadId,
  type ChatCleanupJobFinish,
  type ChatDeliveryPartFinish,
  type ChatStarterDeliveryFinish,
} from '@/lib/chat-delivery-repository'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const SNOWFLAKE_PATTERN = /^\d{1,30}$/u
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu
const MAX_PARTS = 20
const MAX_WORK_OPERATIONS = 25
const LEASE_SECONDS = 60
const RETRY_FALLBACK_SECONDS = 60 * 60
const PERMANENT_FAILURE_RETRY_SECONDS = 24 * 60 * 60
const EMAIL_REDACTION = '[email redacted]'

export type ChatDeliveryRunStatus = 'sent' | 'uncertain' | 'failed' | 'skipped'

export interface ChatDeliveryResult {
  conversationId: string
  status: ChatDeliveryRunStatus
  starterAttempted: boolean
  partsAttempted: number
  partsSent: number
  partsUncertain: number
  partsFailed: number
  failureCode: string | null
  nextRetryAt: string | null
}

export interface ChatDeliveryBatchResult {
  candidates: number
  conversations: number
  attempted: number
  sent: number
  uncertain: number
  failed: number
  skipped: number
}

export interface ChatCleanupResult {
  jobId: string
  state: ChatCleanupJob['state'] | 'skipped'
  threadDeleted: boolean
  starterDeleted: boolean
  failureCode: string | null
  nextRetryAt: string | null
}

interface DeliveryRepository {
  getChatDeliveryConversation: typeof getChatDeliveryConversation
  getChatDeliveryMessage: typeof getChatDeliveryMessage
  getFirstChatDeliveryMessage: typeof getFirstChatDeliveryMessage
  prepareChatMessageParts: typeof prepareChatMessageParts
  claimChatThreadLease: typeof claimChatThreadLease
  releaseChatThreadLease: typeof releaseChatThreadLease
  prepareChatStarterDelivery: typeof prepareChatStarterDelivery
  claimChatStarterDelivery: typeof claimChatStarterDelivery
  claimUncertainChatStarterDelivery: typeof claimUncertainChatStarterDelivery
  finishChatStarterDelivery: typeof finishChatStarterDelivery
  saveChatThreadId: typeof saveChatThreadId
  claimChatDeliveryPart: typeof claimChatDeliveryPart
  claimUncertainChatDeliveryPart: typeof claimUncertainChatDeliveryPart
  finishChatDeliveryPart: typeof finishChatDeliveryPart
  listChatDeliveryWorkCandidates: typeof listChatDeliveryWorkCandidates
  listChatDeliveryWorkCandidatesForConversation: typeof listChatDeliveryWorkCandidatesForConversation
  claimChatCleanupJob: typeof claimChatCleanupJob
  claimUncertainChatCleanupJob: typeof claimUncertainChatCleanupJob
  finishChatCleanupJob: typeof finishChatCleanupJob
}

const defaultRepository: DeliveryRepository = {
  getChatDeliveryConversation,
  getChatDeliveryMessage,
  getFirstChatDeliveryMessage,
  prepareChatMessageParts,
  claimChatThreadLease,
  releaseChatThreadLease,
  prepareChatStarterDelivery,
  claimChatStarterDelivery,
  claimUncertainChatStarterDelivery,
  finishChatStarterDelivery,
  saveChatThreadId,
  claimChatDeliveryPart: claimChatDeliveryPart,
  claimUncertainChatDeliveryPart,
  finishChatDeliveryPart,
  listChatDeliveryWorkCandidates,
  listChatDeliveryWorkCandidatesForConversation,
  claimChatCleanupJob,
  claimUncertainChatCleanupJob,
  finishChatCleanupJob,
}

export interface ChatDeliveryDependencies {
  config?: ChatServerConfig
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  now?: () => Date
  uuid?: () => string
  client?: DiscordRestClient
  repository?: Partial<DeliveryRepository>
}

function repositoryFor(dependencies: ChatDeliveryDependencies): DeliveryRepository {
  return { ...defaultRepository, ...(dependencies.repository ?? {}) }
}

function nowFor(dependencies: ChatDeliveryDependencies): Date {
  const value = dependencies.now?.() ?? new Date()
  return Number.isFinite(value.getTime()) ? value : new Date()
}

function uuidFor(dependencies: ChatDeliveryDependencies): string {
  const value = dependencies.uuid ? dependencies.uuid() : randomUUID()
  if (!UUID_PATTERN.test(value)) throw new Error('Invalid delivery UUID.')
  return value
}

function validUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function validSnowflake(value: string | null): value is string {
  return value !== null && SNOWFLAKE_PATTERN.test(value)
}

function safeErrorCode(error: unknown): string {
  if (error instanceof DiscordRestError) return error.code
  if (error && typeof error === 'object' && 'routeCode' in error) {
    const routeCode = String((error as { routeCode?: unknown }).routeCode ?? '')
    return /^[a-z0-9_:-]{1,64}$/u.test(routeCode) ? routeCode : 'delivery_unavailable'
  }
  return 'delivery_unavailable'
}

function isRepoLeaseBusy(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'routeCode' in error
    && String((error as { routeCode?: unknown }).routeCode ?? '') === 'delivery_lease_unavailable')
}

function nextRetryAt(now: Date, seconds: number): string {
  return new Date(now.getTime() + Math.max(1, Math.ceil(seconds)) * 1_000).toISOString()
}

function failureRetry(error: unknown, now: Date): string | null {
  if (error instanceof DiscordRestError && error.code === 'discord_429') {
    return nextRetryAt(now, error.retryAfterSeconds ?? RETRY_FALLBACK_SECONDS)
  }
  if (error instanceof DiscordRestError && [
    'discord_timeout',
    'discord_network',
    'discord_http_5xx',
    // A successful POST with an unreadable response may already have created
    // the Discord message; never classify it as safe to resend.
    'discord_malformed',
  ].includes(error.code)) return null
  return nextRetryAt(now, PERMANENT_FAILURE_RETRY_SECONDS)
}

function isUncertainExternalFailure(error: unknown): boolean {
  return error instanceof DiscordRestError && [
    'discord_timeout',
    'discord_network',
    'discord_http_5xx',
    'discord_malformed',
  ].includes(error.code)
}

function referenceMarker(reference: string): string {
  return `[pot-ref:${reference}]`
}

/** Stable short-window nonce; database references remain the durable identity. */
export function stableDiscordNonce(reference: string): string {
  return `pot_${createHash('sha256').update(reference).digest('base64url').slice(0, 20)}`
}

export function redactEmailAddresses(value: string): string {
  return value.replace(EMAIL_PATTERN, EMAIL_REDACTION)
}

/** Escape Discord markdown without changing the stored transcript body. */
export function escapeDiscordText(value: string): string {
  return redactEmailAddresses(value)
    .replaceAll('\\', '\\\\')
    .replace(/[\\*_~`>]/gu, '\\$&')
}

function splitUtf16(value: string, maxLength: number): string[] {
  const result: string[] = []
  let current = ''
  for (const character of value) {
    if (current.length > 0 && current.length + character.length > maxLength) {
      result.push(current)
      current = ''
    }
    current += character
  }
  if (current.length > 0) result.push(current)
  return result
}

function partReference(conversationId: string, messageId: string, partIndex: number): string {
  return `chat:${conversationId}:message:${messageId}:part:${partIndex}`
}

function starterReference(conversationId: string): string {
  return `chat:${conversationId}:starter`
}

export function chatModerationComponents(conversationId: string): DiscordComponentRow[] {
  if (!validUuid(conversationId)) throw new Error('Invalid conversation id.')
  return [{
    type: 1,
    components: [
      { type: 2, style: 1, label: 'Reply', custom_id: `pot:v1:reply:${conversationId}` },
      { type: 2, style: 2, label: 'Close', custom_id: `pot:v1:close:${conversationId}` },
      { type: 2, style: 4, label: 'Mark spam', custom_id: `pot:v1:spam:${conversationId}` },
    ],
  }]
}

function starterPayload(conversationId: string, reference: string, nonce: string) {
  return {
    content: `Pillars of Tech chat conversation ${conversationId}\n${referenceMarker(reference)}`,
    nonce,
    enforceNonce: true as const,
    allowedMentions: { parse: [] as [] },
    flags: DISCORD_SUPPRESS_EMBEDS,
    components: chatModerationComponents(conversationId),
  }
}

function messageParts(
  conversationId: string,
  message: ChatDeliveryMessage,
): { definitions: { partIndex: number; stableReference: string; stableNonce: string }[]; contents: string[] } {
  const parsedMessage = chatDeliveryMessageSchema.safeParse(message)
  if (!parsedMessage.success || parsedMessage.data.conversationId !== conversationId) {
    throw new Error('Invalid chat delivery message.')
  }
  const prefix = message.sender === 'staff' ? 'Pillars of Tech team\n' : ''
  const escaped = escapeDiscordText(message.body.trim())
  // Reserve marker/prefix space.  Four-thousand stored characters can expand
  // when markdown is escaped, but remain comfortably within 20 durable rows.
  const bodyChunks = splitUtf16(escaped, 1_600)
  if (bodyChunks.length < 1 || bodyChunks.length > MAX_PARTS) throw new Error('Chat message has too many delivery parts.')
  const definitions = bodyChunks.map((_, index) => {
    const reference = partReference(conversationId, message.id, index)
    return { partIndex: index, stableReference: reference, stableNonce: stableDiscordNonce(reference) }
  })
  const contents = bodyChunks.map((chunk, index) => {
    const content = `${prefix}${referenceMarker(definitions[index]!.stableReference)}\n${chunk}`
    if (content.length > DISCORD_MAX_CONTENT_LENGTH) throw new Error('Chat delivery part exceeds Discord content limit.')
    return content
  })
  return { definitions, contents }
}

function clientFor(dependencies: ChatDeliveryDependencies, config: ChatServerConfig): DiscordRestClient {
  return dependencies.client ?? createDiscordRestClient({
    config,
    fetch: dependencies.fetch,
    timeoutMs: dependencies.timeoutMs,
  })
}

interface ConversationContext {
  conversation: ChatDeliveryConversation
  leaseToken: string
  client: DiscordRestClient
  repository: DeliveryRepository
  dependencies: ChatDeliveryDependencies
}

function conversationWithStarter(
  conversation: ChatDeliveryConversation,
  starter: {
    starterMessageId: string | null
    starterReference: string | null
    starterNonce: string | null
    starterState: ChatDeliveryConversation['discordStarterState']
    claimToken: string | null
    claimExpiresAt: string | null
    attemptCount: number
    failureCode: string | null
    nextRetryAt: string | null
    threadId: string | null
  },
): ChatDeliveryConversation {
  return {
    ...conversation,
    discordStarterMessageId: starter.starterMessageId,
    discordStarterReference: starter.starterReference,
    discordStarterNonce: starter.starterNonce,
    discordStarterState: starter.starterState,
    discordStarterClaimToken: starter.claimToken,
    discordStarterClaimExpiresAt: starter.claimExpiresAt,
    discordStarterAttemptCount: starter.attemptCount,
    discordStarterFailureCode: starter.failureCode,
    discordStarterNextRetryAt: starter.nextRetryAt,
    discordThreadId: starter.threadId,
  }
}

function relationError(message: string): DiscordRestError {
  return new DiscordRestError('discord_relation', message)
}

async function readyThread(context: ConversationContext): Promise<ChatDeliveryConversation> {
  const { repository, conversation, client, leaseToken } = context
  let current = conversation
  let threadId = current.discordThreadId
  const starterId = current.discordStarterMessageId
  if (!starterId) throw relationError('A Discord starter is required before creating its thread.')
  if (threadId !== null && threadId !== starterId) {
    throw relationError('Stored Discord thread id must equal the starter message id.')
  }

  if (!threadId) {
    // A timeout after Start Thread from Message is reconciled by fetching the
    // invariant thread id before another POST is considered.
    try {
      const existing = await client.getThread(starterId)
      threadId = existing.id
    } catch (error) {
      if (!(error instanceof DiscordRestError) || error.code !== 'discord_not_found') throw error
      const created = await client.startThreadFromMessage(starterId, `Pillars of Tech chat ${current.id.slice(0, 8)}`)
      threadId = created.id
    }
    if (threadId !== starterId) throw relationError('Discord thread id must equal the starter message id.')
    current = conversationWithStarter(current, await repository.saveChatThreadId(current.id, leaseToken, threadId))
  }

  if (!validSnowflake(threadId)) throw relationError('Stored Discord thread id is invalid.')
  let thread = await client.getThread(threadId)
  if (thread.archived) {
    if (thread.locked) throw new DiscordRestError('discord_thread_locked', 'Discord thread is locked.')
    thread = await client.unarchiveThread(threadId)
  }
  if (thread.id !== threadId) throw relationError('Discord thread identity did not match storage.')
  return current
}

async function finishStarter(
  context: ConversationContext,
  claimToken: string,
  input: ChatStarterDeliveryFinish,
): Promise<ChatDeliveryConversation | null> {
  try {
    const result = await context.repository.finishChatStarterDelivery(
      context.conversation.id,
      context.leaseToken,
      claimToken,
      input,
    )
    return conversationWithStarter(context.conversation, result)
  } catch {
    return null
  }
}

async function claimStarter(context: ConversationContext): Promise<{ claimToken: string; starter: ChatDeliveryConversation } | null> {
  const { repository, conversation, leaseToken, dependencies } = context
  const claimToken = uuidFor(dependencies)
  let claimed
  try {
    claimed = conversation.discordStarterState === 'uncertain'
      ? await repository.claimUncertainChatStarterDelivery(conversation.id, leaseToken, claimToken, LEASE_SECONDS)
      : await repository.claimChatStarterDelivery(conversation.id, leaseToken, claimToken, LEASE_SECONDS)
  } catch (error) {
    if (isRepoLeaseBusy(error)) return null
    throw error
  }
  return {
    claimToken,
    starter: conversationWithStarter(conversation, claimed),
  }
}

async function ensureStarter(context: ConversationContext, hasMessage: boolean, result: ChatDeliveryResult): Promise<ChatDeliveryConversation | null> {
  const { repository, conversation, client, dependencies } = context
  if (!hasMessage) return null
  if (conversation.discordStarterMessageId && conversation.discordStarterState === 'sent') return conversation

  const reference = conversation.discordStarterReference ?? starterReference(conversation.id)
  const nonce = conversation.discordStarterNonce ?? stableDiscordNonce(reference)
  await repository.prepareChatStarterDelivery(conversation.id, context.leaseToken, reference, nonce)
  const claimed = await claimStarter(context)
  if (!claimed) {
    result.failureCode = 'delivery_lease_unavailable'
    return null
  }
  result.starterAttempted = true
  const currentStarter = claimed.starter
  const needsReconciliation = conversation.discordStarterState === 'uncertain'
    || currentStarter.discordStarterState === 'uncertain'
  if (needsReconciliation) {
    // An already-uncertain row is claimed by claim_uncertain_chat_starter_delivery
    // inside claimStarter, so its generated token is already the reconciliation
    // fence. An expired normal claim is first normalized to uncertain by the
    // ordinary claim RPC and then needs the explicit uncertain claim here.
    let reconcileToken = claimed.claimToken
    let reconClaim = currentStarter
    if (currentStarter.discordStarterState === 'uncertain' || !reconcileToken) {
      reconcileToken = uuidFor(dependencies)
      reconClaim = conversationWithStarter(conversation, await repository.claimUncertainChatStarterDelivery(
        conversation.id,
        context.leaseToken,
        reconcileToken,
        LEASE_SECONDS,
      ))
    }
    if (!reconcileToken) throw relationError('Uncertain starter has no reconciliation claim.')
    const expectedReference = reconClaim.discordStarterReference
    if (!expectedReference) throw relationError('Uncertain starter has no durable reference.')
    try {
      const history = await findMatchingHistory(client, true, null, expectedReference, reconClaim.discordStarterNonce)
      if (history) {
        const finished = await finishStarter(context, reconcileToken, { outcome: 'sent', starterMessageId: history.id })
        if (!finished) throw new Error('Starter completion was fenced.')
        return finished
      }
      const finished = await finishStarter(context, reconcileToken, { outcome: 'uncertain', failureCode: 'discord_reconcile_not_found' })
      if (!finished) throw new Error('Starter reconciliation completion was fenced.')
      result.status = 'uncertain'
      result.failureCode = 'discord_reconcile_not_found'
      return null
    } catch (error) {
      const finished = await finishStarter(context, reconcileToken, { outcome: 'uncertain', failureCode: safeErrorCode(error) })
      if (!finished) throw error
      result.status = 'uncertain'
      result.failureCode = safeErrorCode(error)
      return null
    }
  }
  if (!validSnowflake(currentStarter.discordStarterMessageId)) {
    try {
      const sent = await client.sendStarterMessage(starterPayload(conversation.id, reference, nonce))
      const finished = await finishStarter(context, claimed.claimToken, { outcome: 'sent', starterMessageId: sent.id })
      if (!finished) throw new Error('Starter completion was fenced.')
      return finished
    } catch (error) {
      const outcome: ChatStarterDeliveryFinish = isUncertainExternalFailure(error)
        ? { outcome: 'uncertain', failureCode: safeErrorCode(error) }
        : { outcome: 'failed', failureCode: safeErrorCode(error), nextRetryAt: failureRetry(error, nowFor(dependencies)) }
      const finished = await finishStarter(context, claimed.claimToken, outcome)
      if (!finished) throw error
      result.status = outcome.outcome === 'uncertain' ? 'uncertain' : 'failed'
      result.failureCode = safeErrorCode(error)
      result.nextRetryAt = outcome.nextRetryAt ?? null
      return null
    }
  }
  return currentStarter
}

async function findMatchingHistory(
  client: DiscordRestClient,
  parent: boolean,
  threadId: string | null,
  reference: string,
  nonce: string | null,
): Promise<DiscordMessage | null> {
  let before: string | null = null
  for (let page = 0; page < DISCORD_MAX_HISTORY_PAGES; page += 1) {
    const messages: DiscordMessage[] = parent
      ? await client.listParentMessages(before)
      : await client.listThreadMessages(threadId!, before)
    const match = messages.find((message) => message.authorBot
      && message.authorId === client.botAuthorId
      && message.content.includes(referenceMarker(reference))
      && (message.nonce === null || message.nonce === nonce))
    if (match) return match
    if (messages.length < DISCORD_HISTORY_PAGE_SIZE) return null
    const oldest = messages[messages.length - 1]
    if (!oldest || oldest.id === before) return null
    before = oldest.id
  }
  // An incomplete history window is intentionally unresolved.  The caller
  // must not interpret it as proof that a POST did not happen.
  return null
}

async function finishPart(
  context: ConversationContext,
  part: ChatDeliveryPart,
  claimToken: string,
  input: ChatDeliveryPartFinish,
): Promise<boolean> {
  try {
    await context.repository.finishChatDeliveryPart(
      context.conversation.id,
      context.leaseToken,
      part.id,
      claimToken,
      input,
    )
    return true
  } catch {
    return false
  }
}

interface PartProcessResult {
  attempted: boolean
  sent: boolean
  uncertain: boolean
  failed: boolean
  failureCode: string | null
  nextRetryAt: string | null
}

async function reconcilePart(context: ConversationContext, part: ChatDeliveryPart): Promise<PartProcessResult> {
  const token = uuidFor(context.dependencies)
  let claimed: ChatDeliveryPart
  try {
    claimed = await context.repository.claimUncertainChatDeliveryPart(
      context.conversation.id,
      context.leaseToken,
      part.id,
      token,
      LEASE_SECONDS,
    )
  } catch (error) {
    return { attempted: false, sent: false, uncertain: false, failed: false, failureCode: safeErrorCode(error), nextRetryAt: null }
  }
  try {
    const history = await findMatchingHistory(context.client, false, context.conversation.discordThreadId, claimed.stableReference, claimed.stableNonce)
    const input: ChatDeliveryPartFinish = history
      ? { outcome: 'sent', discordMessageId: history.id }
      : { outcome: 'uncertain', failureCode: 'discord_reconcile_not_found' }
    const completed = await finishPart(context, claimed, token, input)
    if (!completed) return { attempted: true, sent: false, uncertain: true, failed: false, failureCode: 'delivery_fence_lost', nextRetryAt: null }
    return history
      ? { attempted: true, sent: true, uncertain: false, failed: false, failureCode: null, nextRetryAt: null }
      : { attempted: true, sent: false, uncertain: true, failed: false, failureCode: 'discord_reconcile_not_found', nextRetryAt: null }
  } catch (error) {
    const completed = await finishPart(context, claimed, token, { outcome: 'uncertain', failureCode: safeErrorCode(error) })
    return { attempted: true, sent: false, uncertain: true, failed: false, failureCode: completed ? safeErrorCode(error) : 'delivery_fence_lost', nextRetryAt: null }
  }
}

async function sendPart(context: ConversationContext, part: ChatDeliveryPart): Promise<PartProcessResult> {
  const token = part.claimToken
  if (!token) return { attempted: false, sent: false, uncertain: true, failed: false, failureCode: 'delivery_fence_lost', nextRetryAt: null }
  let message: ChatDeliveryMessage
  try {
    message = await context.repository.getChatDeliveryMessage(part.messageId, context.conversation.id)
  } catch (error) {
    const completed = await finishPart(context, part, token, { outcome: 'uncertain', failureCode: safeErrorCode(error) })
    return { attempted: true, sent: false, uncertain: true, failed: false, failureCode: completed ? safeErrorCode(error) : 'delivery_fence_lost', nextRetryAt: null }
  }
  let built
  try {
    built = messageParts(context.conversation.id, message)
  } catch {
    const retryAt = nextRetryAt(nowFor(context.dependencies), PERMANENT_FAILURE_RETRY_SECONDS)
    const completed = await finishPart(context, part, token, { outcome: 'failed', failureCode: 'discord_malformed', nextRetryAt: retryAt })
    return { attempted: true, sent: false, uncertain: false, failed: true, failureCode: completed ? 'discord_malformed' : 'delivery_fence_lost', nextRetryAt: completed ? retryAt : null }
  }
  const content = built.contents[part.partIndex]
  if (!content || built.definitions.length !== part.partCount) {
    const retryAt = nextRetryAt(nowFor(context.dependencies), PERMANENT_FAILURE_RETRY_SECONDS)
    const completed = await finishPart(context, part, token, { outcome: 'failed', failureCode: 'discord_malformed', nextRetryAt: retryAt })
    return { attempted: true, sent: false, uncertain: false, failed: true, failureCode: completed ? 'discord_malformed' : 'delivery_fence_lost', nextRetryAt: completed ? retryAt : null }
  }
  try {
    const sent = await context.client.sendThreadMessage(context.conversation.discordThreadId!, {
      content,
      nonce: part.stableNonce,
      enforceNonce: true,
      allowedMentions: { parse: [] },
      flags: DISCORD_SUPPRESS_EMBEDS,
      ...(message.sender === 'visitor' ? { components: chatModerationComponents(context.conversation.id) } : {}),
    })
    const completed = await finishPart(context, part, token, { outcome: 'sent', discordMessageId: sent.id })
    return completed
      ? { attempted: true, sent: true, uncertain: false, failed: false, failureCode: null, nextRetryAt: null }
      : { attempted: true, sent: false, uncertain: true, failed: false, failureCode: 'delivery_fence_lost', nextRetryAt: null }
  } catch (error) {
    const uncertain = isUncertainExternalFailure(error)
    const retryAt = failureRetry(error, nowFor(context.dependencies))
    const input: ChatDeliveryPartFinish = uncertain
      ? { outcome: 'uncertain', failureCode: safeErrorCode(error) }
      : { outcome: 'failed', failureCode: safeErrorCode(error), nextRetryAt: retryAt }
    const completed = await finishPart(context, part, token, input)
    return {
      attempted: true,
      sent: false,
      uncertain: uncertain || !completed,
      failed: !uncertain && completed,
      failureCode: completed ? safeErrorCode(error) : 'delivery_fence_lost',
      nextRetryAt: completed ? retryAt : null,
    }
  }
}

function emptyResult(conversationId: string): ChatDeliveryResult {
  return {
    conversationId,
    status: 'skipped',
    starterAttempted: false,
    partsAttempted: 0,
    partsSent: 0,
    partsUncertain: 0,
    partsFailed: 0,
    failureCode: null,
    nextRetryAt: null,
  }
}

/** Deliver one conversation under one short conversation lease. */
export async function deliverChatConversation(
  conversationId: string,
  dependencies: ChatDeliveryDependencies = {},
): Promise<ChatDeliveryResult> {
  const result = emptyResult(conversationId)
  if (!validUuid(conversationId)) {
    result.failureCode = 'invalid_request'
    return result
  }
  const config = dependencies.config ?? getChatServerConfig()
  if (!config.discordDeliveryReady) {
    result.failureCode = 'discord_config'
    return result
  }
  const repository = repositoryFor(dependencies)
  const leaseToken = uuidFor(dependencies)
  let leaseHeld = false
  try {
    await repository.claimChatThreadLease(conversationId, leaseToken, LEASE_SECONDS)
    leaseHeld = true
    const client = clientFor(dependencies, config)
    const conversation = await repository.getChatDeliveryConversation(conversationId)
    const context: ConversationContext = { conversation, leaseToken, client, repository, dependencies }
    const firstMessage = await repository.getFirstChatDeliveryMessage(conversationId)
    let current = await ensureStarter(context, firstMessage !== null, result)
    if (!current) {
      if (result.failureCode === null) result.failureCode = 'no_work'
      result.status = result.status === 'uncertain' ? 'uncertain' : result.status === 'failed' ? 'failed' : 'skipped'
      return result
    }
    context.conversation = current
    current = await readyThread(context)
    context.conversation = current

    let completedWorkEnumeration = false
    for (let operation = 0; operation < MAX_WORK_OPERATIONS; operation += 1) {
      const candidates = await repository.listChatDeliveryWorkCandidatesForConversation(
        conversationId,
        MAX_WORK_OPERATIONS,
      )
      const candidate = candidates.find((item) => item.workKind !== 'starter' && item.workKind !== 'starter_reconcile')
      if (!candidate) {
        // Empty eligible work does not prove success when a row may have
        // exhausted its durable attempt budget. Re-read the aggregate written
        // by the finish RPC so capped/pending work is never reported sent.
        const aggregate = await repository.getChatDeliveryConversation(conversationId)
        result.status = aggregate.discordDeliveryStatus === 'sent'
          ? 'sent'
          : aggregate.discordDeliveryStatus === 'failed'
            ? 'failed'
            : 'uncertain'
        if (result.status === 'sent') result.failureCode = null
        else if (result.failureCode === null) result.failureCode = aggregate.discordDeliveryStatus === 'failed' ? 'delivery_failed' : 'delivery_pending'
        completedWorkEnumeration = true
        break
      }
      if (candidate.workKind === 'message_prepare' && candidate.messageId) {
        const message = await repository.getChatDeliveryMessage(candidate.messageId, conversationId)
        const built = messageParts(conversationId, message)
        await repository.prepareChatMessageParts(message.id, built.definitions)
        continue
      }
      if (!candidate.partId) {
        result.failureCode = 'delivery_unavailable'
        result.status = 'uncertain'
        break
      }
      let partResult: PartProcessResult
      if (candidate.workKind === 'part_reconcile') {
        const part: ChatDeliveryPart = {
          id: candidate.partId,
          messageId: candidate.messageId ?? '',
          partIndex: 0,
          partCount: 1,
          stableReference: '',
          stableNonce: '',
          discordMessageId: null,
          state: 'uncertain',
          claimToken: null,
          leaseExpiresAt: null,
          attemptCount: candidate.attemptCount,
          failureCode: null,
          nextRetryAt: candidate.nextRetryAt,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        }
        // The candidate is intentionally body-free; fetch the real metadata
        // through the claim RPC, whose result is used by reconcilePart.
        partResult = await reconcilePart(context, part)
      } else {
        const claimed = await repository.claimChatDeliveryPart(conversationId, leaseToken, uuidFor(dependencies), LEASE_SECONDS)
        if (!claimed) continue
        if (claimed.state === 'uncertain') {
          partResult = await reconcilePart(context, claimed)
        } else {
          partResult = await sendPart(context, claimed)
        }
      }
      if (partResult.attempted) result.partsAttempted += 1
      if (partResult.sent) result.partsSent += 1
      if (partResult.uncertain) result.partsUncertain += 1
      if (partResult.failed) result.partsFailed += 1
      if (partResult.failureCode) result.failureCode = partResult.failureCode
      if (partResult.nextRetryAt) result.nextRetryAt = partResult.nextRetryAt
      if (partResult.uncertain) {
        result.status = 'uncertain'
        break
      }
      if (partResult.failed) {
        result.status = 'failed'
        break
      }
    }
    if (!completedWorkEnumeration && result.status === 'skipped') {
      // A bounded worker must not report success while an unenumerated row
      // may remain. The durable candidate remains available for the next poll.
      result.status = 'uncertain'
      result.failureCode = 'delivery_work_limit'
    }
    return result
  } catch (error) {
    result.status = isUncertainExternalFailure(error) ? 'uncertain' : isRepoLeaseBusy(error) ? 'skipped' : 'failed'
    result.failureCode = safeErrorCode(error)
    result.nextRetryAt = failureRetry(error, nowFor(dependencies))
    return result
  } finally {
    if (leaseHeld) {
      try { await repository.releaseChatThreadLease(conversationId, leaseToken) } catch { /* safe cleanup is best effort */ }
    }
  }
}

/** Enumerate body-free candidates once, then process each conversation once. */
export async function dispatchChatDeliveryBatch(
  limit = 25,
  dependencies: ChatDeliveryDependencies = {},
): Promise<ChatDeliveryBatchResult> {
  const result: ChatDeliveryBatchResult = { candidates: 0, conversations: 0, attempted: 0, sent: 0, uncertain: 0, failed: 0, skipped: 0 }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return result
  const config = dependencies.config ?? getChatServerConfig()
  if (!config.discordDeliveryReady) return result
  const repository = repositoryFor(dependencies)
  let candidates: ChatDeliveryWorkCandidate[]
  try {
    candidates = await repository.listChatDeliveryWorkCandidates(limit)
  } catch {
    return result
  }
  result.candidates = candidates.length
  const conversations = [...new Set(candidates.map((candidate) => candidate.conversationId))]
  result.conversations = conversations.length
  for (const conversationId of conversations) {
    const delivery = await deliverChatConversation(conversationId, dependencies)
    if (delivery.status === 'sent') result.sent += 1
    else if (delivery.status === 'uncertain') result.uncertain += 1
    else if (delivery.status === 'failed') result.failed += 1
    else result.skipped += 1
    if (delivery.starterAttempted || delivery.partsAttempted > 0) result.attempted += 1
  }
  return result
}

function cleanupErrorOutcome(error: unknown, now: Date): ChatCleanupJobFinish {
  if (isUncertainExternalFailure(error)) return { outcome: 'uncertain', failureCode: safeErrorCode(error) }
  return { outcome: 'failed', failureCode: safeErrorCode(error), nextRetryAt: failureRetry(error, now) ?? nextRetryAt(now, RETRY_FALLBACK_SECONDS) }
}

/** Delete only the configured bot-created thread and starter message. */
export async function cleanupDiscordChatJob(
  job: ChatCleanupJob,
  dependencies: ChatDeliveryDependencies = {},
): Promise<ChatCleanupResult> {
  const result: ChatCleanupResult = {
    jobId: job?.id ?? '',
    state: 'skipped',
    threadDeleted: false,
    starterDeleted: false,
    failureCode: null,
    nextRetryAt: null,
  }
  if (!job || job.state !== 'claimed' || !job.claimToken) {
    result.failureCode = 'delivery_lease_unavailable'
    return result
  }
  const config = dependencies.config ?? getChatServerConfig()
  const repository = repositoryFor(dependencies)
  const now = nowFor(dependencies)
  const finish = async (input: ChatCleanupJobFinish): Promise<ChatCleanupResult> => {
    try {
      const completed = await repository.finishChatCleanupJob(job.id, job.claimToken!, input)
      result.state = completed.state
    } catch {
      result.state = input.outcome === 'uncertain' ? 'uncertain' : input.outcome === 'failed' ? 'failed' : 'skipped'
    }
    result.failureCode = input.failureCode ?? null
    result.nextRetryAt = input.nextRetryAt ?? null
    return result
  }
  if (!config.discordDeliveryReady || job.guildId !== config.discordGuildId || job.parentChannelId !== config.discordChannelId) {
    return finish({ outcome: 'failed', failureCode: 'discord_relation', nextRetryAt: nextRetryAt(now, RETRY_FALLBACK_SECONDS) })
  }
  if (job.threadId !== null && (!validSnowflake(job.threadId) || job.threadId !== job.starterMessageId)) {
    return finish({ outcome: 'failed', failureCode: 'discord_relation', nextRetryAt: nextRetryAt(now, RETRY_FALLBACK_SECONDS) })
  }
  let client: DiscordRestClient
  try {
    client = clientFor(dependencies, config)
  } catch (error) {
    return finish(cleanupErrorOutcome(error, now))
  }
  try {
    if (job.threadId) {
      try {
        await client.deleteConfiguredThread(job.threadId, job.parentChannelId, job.starterMessageId)
        result.threadDeleted = true
      } catch (error) {
        if (error instanceof DiscordRestError && error.code === 'discord_not_found') result.threadDeleted = true
        else throw error
      }
    }
    if (job.starterMessageId) {
      try {
        await client.deleteStarterMessage(job.starterMessageId)
        result.starterDeleted = true
      } catch (error) {
        if (error instanceof DiscordRestError && error.code === 'discord_not_found') result.starterDeleted = true
        else throw error
      }
    }
    return finish({ outcome: 'succeeded' })
  } catch (error) {
    return finish(cleanupErrorOutcome(error, now))
  }
}

// Explicit aliases for future staff/retention callers.
export const runChatDelivery = deliverChatConversation
export const dispatchChatDelivery = dispatchChatDeliveryBatch
