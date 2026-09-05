import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  chatCleanupJobSchema,
  chatCleanupPreparationSchema,
  chatDeliveryOutcomeSchema,
  chatDeliveryPartDefinitionSchema,
  chatDeliveryPartSchema,
  chatDeliveryConversationSchema,
  chatDeliveryMessageSchema,
  chatDeliveryWorkCandidateSchema,
  chatStarterDeliverySchema,
  chatThreadLeaseSchema,
  type ChatCleanupJob,
  type ChatCleanupPreparation,
  type ChatDeliveryOutcome,
  type ChatDeliveryPart,
  type ChatDeliveryPartDefinition,
  type ChatDeliveryConversation,
  type ChatDeliveryMessage,
  type ChatDeliveryWorkCandidate,
  type ChatStarterDelivery,
  type ChatThreadLease,
} from '@/lib/chat-delivery-contracts'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const snowflakePattern = /^\d{1,30}$/u
const safeCodePattern = /^[a-z0-9_:-]{1,64}$/u
const stableReferencePattern = /^[A-Za-z0-9._:-]{1,160}$/u
const stableNoncePattern = /^[A-Za-z0-9_-]{16,128}$/u

const deliveryConversationSelect = [
  'id',
  'status',
  'discord_delivery_status',
  'discord_thread_id',
  'discord_thread_state',
  'discord_thread_attempt_count',
  'discord_thread_failure_code',
  'discord_thread_next_retry_at',
  'discord_starter_message_id',
  'discord_starter_reference',
  'discord_starter_nonce',
  'discord_starter_state',
  'discord_starter_claim_token',
  'discord_starter_claim_expires_at',
  'discord_starter_attempt_count',
  'discord_starter_failure_code',
  'discord_starter_next_retry_at',
].join(',')
const deliveryMessageSelect = [
  'id',
  'conversation_id',
  'sender',
  'body',
  'delivery_status',
  'delivery_part_count',
  'created_at',
].join(',')

export type ChatDeliveryRepositoryErrorCode =
  | 'invalid_request'
  | 'conversation_not_found'
  | 'message_not_found'
  | 'delivery_conflict'
  | 'delivery_lease_unavailable'
  | 'chat_unavailable'

export class ChatDeliveryRepositoryError extends Error {
  readonly status: 400 | 404 | 409 | 503
  readonly routeCode: ChatDeliveryRepositoryErrorCode

  constructor(
    message: string,
    status: 400 | 404 | 409 | 503 = 503,
    routeCode: ChatDeliveryRepositoryErrorCode = 'chat_unavailable',
  ) {
    super(message)
    this.name = 'ChatDeliveryRepositoryError'
    this.status = status
    this.routeCode = routeCode
  }
}

function serviceClient(): SupabaseClient {
  try {
    return createSupabaseServiceRoleClient()
  } catch {
    throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  }
}

function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : ''
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
    : []
}

function row(value: unknown): Record<string, unknown> | null {
  const result = Array.isArray(value) ? value[0] : value
  return result && typeof result === 'object' && !Array.isArray(result)
    ? result as Record<string, unknown>
    : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function nullableText(value: unknown): string | null {
  return value == null ? null : text(value)
}

function validateUuid(value: string, message = 'Invalid delivery identifier.'): void {
  if (!uuidPattern.test(value)) throw new ChatDeliveryRepositoryError(message, 400, 'invalid_request')
}

function validateLeaseSeconds(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 300) {
    throw new ChatDeliveryRepositoryError('Invalid delivery lease.', 400, 'invalid_request')
  }
}

function validateSnowflake(value: string | null, nullable = true): void {
  if (value === null && nullable) return
  if (value === null || !snowflakePattern.test(value)) {
    throw new ChatDeliveryRepositoryError('Invalid Discord identifier.', 400, 'invalid_request')
  }
}

function validateSafeCode(value: string | null): void {
  if (value !== null && !safeCodePattern.test(value)) {
    throw new ChatDeliveryRepositoryError('Invalid delivery failure code.', 400, 'invalid_request')
  }
}

function throwRpcFailure(error: unknown): never {
  switch (errorCode(error)) {
    case 'P0002':
      throw new ChatDeliveryRepositoryError('Chat delivery record was not found.', 404, 'conversation_not_found')
    case 'P0005':
      throw new ChatDeliveryRepositoryError('Chat delivery action conflicts with an earlier action.', 409, 'delivery_conflict')
    case 'P0007':
    case 'P0009':
    case 'P0010':
      throw new ChatDeliveryRepositoryError('Chat delivery lease is busy or requires reconciliation.', 409, 'delivery_lease_unavailable')
    case '22023':
      throw new ChatDeliveryRepositoryError('Invalid chat delivery request.', 400, 'invalid_request')
    default:
      throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  }
}

function deliveryPartFromRow(value: unknown): ChatDeliveryPart {
  const source = row(value)
  const parsed = chatDeliveryPartSchema.safeParse({
    id: text(source?.id),
    messageId: text(source?.message_id),
    partIndex: Number(source?.part_index),
    partCount: Number(source?.part_count),
    stableReference: text(source?.stable_reference),
    stableNonce: text(source?.stable_nonce),
    discordMessageId: nullableText(source?.discord_message_id),
    state: source?.state,
    claimToken: nullableText(source?.claim_token),
    leaseExpiresAt: source?.lease_expires_at == null ? null : text(source.lease_expires_at),
    attemptCount: Number(source?.attempt_count),
    failureCode: nullableText(source?.failure_code),
    nextRetryAt: source?.next_retry_at == null ? null : text(source.next_retry_at),
    createdAt: text(source?.created_at),
    updatedAt: text(source?.updated_at),
  })
  if (!parsed.success) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

function starterFromRow(value: unknown): ChatStarterDelivery {
  const source = row(value)
  const parsed = chatStarterDeliverySchema.safeParse({
    conversationId: text(source?.id ?? source?.conversation_id),
    starterMessageId: nullableText(source?.discord_starter_message_id),
    starterReference: nullableText(source?.discord_starter_reference),
    starterNonce: nullableText(source?.discord_starter_nonce),
    starterState: source?.discord_starter_state,
    claimToken: nullableText(source?.discord_starter_claim_token),
    claimExpiresAt: source?.discord_starter_claim_expires_at == null ? null : text(source.discord_starter_claim_expires_at),
    attemptCount: Number(source?.discord_starter_attempt_count),
    failureCode: nullableText(source?.discord_starter_failure_code),
    nextRetryAt: source?.discord_starter_next_retry_at == null ? null : text(source.discord_starter_next_retry_at),
    threadId: nullableText(source?.discord_thread_id),
    threadLeaseToken: nullableText(source?.discord_thread_lease_token),
    threadLeaseExpiresAt: source?.discord_thread_lease_expires_at == null ? null : text(source.discord_thread_lease_expires_at),
  })
  if (!parsed.success) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

function threadLeaseFromRow(value: unknown): ChatThreadLease {
  const source = row(value)
  const parsed = chatThreadLeaseSchema.safeParse({
    conversationId: text(source?.id ?? source?.conversation_id),
    leaseToken: text(source?.discord_thread_lease_token),
    leaseExpiresAt: text(source?.discord_thread_lease_expires_at),
  })
  if (!parsed.success) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

function cleanupFromRow(value: unknown): ChatCleanupJob {
  const source = row(value)
  const parsed = chatCleanupJobSchema.safeParse({
    id: text(source?.id),
    conversationId: text(source?.conversation_id),
    guildId: text(source?.guild_id),
    parentChannelId: text(source?.parent_channel_id),
    starterMessageId: nullableText(source?.starter_message_id),
    threadId: nullableText(source?.thread_id),
    state: source?.state,
    claimToken: nullableText(source?.claim_token),
    leaseExpiresAt: source?.lease_expires_at == null ? null : text(source.lease_expires_at),
    attemptCount: Number(source?.attempt_count),
    failureCode: nullableText(source?.failure_code),
    nextRetryAt: source?.next_retry_at == null ? null : text(source.next_retry_at),
    createdAt: text(source?.created_at),
    updatedAt: text(source?.updated_at),
    completedAt: source?.completed_at == null ? null : text(source.completed_at),
  })
  if (!parsed.success) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

function deliveryConversationFromRow(value: unknown): ChatDeliveryConversation {
  const source = row(value)
  const parsed = chatDeliveryConversationSchema.safeParse({
    id: text(source?.id),
    status: source?.status,
    discordDeliveryStatus: source?.discord_delivery_status,
    discordThreadId: nullableText(source?.discord_thread_id),
    discordThreadState: source?.discord_thread_state,
    discordThreadAttemptCount: Number(source?.discord_thread_attempt_count),
    discordThreadFailureCode: nullableText(source?.discord_thread_failure_code),
    discordThreadNextRetryAt: source?.discord_thread_next_retry_at == null ? null : text(source.discord_thread_next_retry_at),
    discordStarterMessageId: nullableText(source?.discord_starter_message_id),
    discordStarterReference: nullableText(source?.discord_starter_reference),
    discordStarterNonce: nullableText(source?.discord_starter_nonce),
    discordStarterState: source?.discord_starter_state,
    discordStarterClaimToken: nullableText(source?.discord_starter_claim_token),
    discordStarterClaimExpiresAt: source?.discord_starter_claim_expires_at == null ? null : text(source.discord_starter_claim_expires_at),
    discordStarterAttemptCount: Number(source?.discord_starter_attempt_count),
    discordStarterFailureCode: nullableText(source?.discord_starter_failure_code),
    discordStarterNextRetryAt: source?.discord_starter_next_retry_at == null ? null : text(source.discord_starter_next_retry_at),
  })
  if (!parsed.success) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

function deliveryMessageFromRow(value: unknown): ChatDeliveryMessage {
  const source = row(value)
  const parsed = chatDeliveryMessageSchema.safeParse({
    id: text(source?.id),
    conversationId: text(source?.conversation_id),
    sender: source?.sender,
    body: text(source?.body),
    deliveryStatus: source?.delivery_status,
    deliveryPartCount: source?.delivery_part_count == null ? null : Number(source.delivery_part_count),
    createdAt: text(source?.created_at),
  })
  if (!parsed.success) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

function deliveryWorkCandidateFromRow(candidate: Record<string, unknown>): ChatDeliveryWorkCandidate {
  const parsed = chatDeliveryWorkCandidateSchema.safeParse({
    conversationId: text(candidate.conversation_id),
    messageId: candidate.message_id == null ? null : text(candidate.message_id),
    partId: candidate.part_id == null ? null : text(candidate.part_id),
    workKind: candidate.work_kind,
    state: candidate.state,
    attemptCount: Number(candidate.attempt_count),
    nextRetryAt: candidate.next_retry_at == null ? null : text(candidate.next_retry_at),
  })
  if (!parsed.success) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

/** Read only the private delivery coordinates; contact fields are not selected. */
export async function getChatDeliveryConversation(conversationId: string): Promise<ChatDeliveryConversation> {
  validateUuid(conversationId, 'Invalid conversation id.')
  const { data, error } = await serviceClient()
    .from('chat_conversations')
    .select(deliveryConversationSelect)
    .eq('id', conversationId)
    .maybeSingle()
  if (error) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  if (!data) throw new ChatDeliveryRepositoryError('Chat delivery record was not found.', 404, 'conversation_not_found')
  return deliveryConversationFromRow(data)
}

/** Read one stored message body only after its conversation is known. */
export async function getChatDeliveryMessage(messageId: string, conversationId?: string): Promise<ChatDeliveryMessage> {
  validateUuid(messageId, 'Invalid chat message id.')
  if (conversationId !== undefined) validateUuid(conversationId, 'Invalid conversation id.')
  let query = serviceClient()
    .from('chat_messages')
    .select(deliveryMessageSelect)
    .eq('id', messageId)
  if (conversationId !== undefined) query = query.eq('conversation_id', conversationId)
  const { data, error } = await query.maybeSingle()
  if (error) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  if (!data) throw new ChatDeliveryRepositoryError('Chat message was not found.', 404, 'message_not_found')
  return deliveryMessageFromRow(data)
}

/** Find the chronological first message used to establish a conversation thread. */
export async function getFirstChatDeliveryMessage(conversationId: string): Promise<ChatDeliveryMessage | null> {
  validateUuid(conversationId, 'Invalid conversation id.')
  const { data, error } = await serviceClient()
    .from('chat_messages')
    .select(deliveryMessageSelect)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
  if (error) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  const values = rows(data)
  return values.length > 0 ? deliveryMessageFromRow(values[0]) : null
}

/** Record deterministic part metadata without copying the original message body. */
export async function prepareChatMessageParts(
  messageId: string,
  parts: ChatDeliveryPartDefinition[],
): Promise<ChatDeliveryPart[]> {
  validateUuid(messageId, 'Invalid chat message id.')
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 20) {
    throw new ChatDeliveryRepositoryError('Invalid message parts.', 400, 'invalid_request')
  }
  const parsedParts = parts.map((part) => chatDeliveryPartDefinitionSchema.safeParse(part))
  if (parsedParts.some((part) => !part.success)) {
    throw new ChatDeliveryRepositoryError('Invalid message parts.', 400, 'invalid_request')
  }
  const normalized = parsedParts.map((part) => part.success ? part.data : null).filter((part): part is ChatDeliveryPartDefinition => part !== null)
  const indices = normalized.map((part) => part.partIndex).sort((a, b) => a - b)
  if (indices.some((index, position) => index !== position)) {
    throw new ChatDeliveryRepositoryError('Message part indexes must be contiguous.', 400, 'invalid_request')
  }
  const client = serviceClient()
  const { data, error } = await client.rpc('prepare_chat_message_parts', {
    p_message_id: messageId,
    p_parts: normalized.map((part) => ({
      part_index: part.partIndex,
      stable_reference: part.stableReference,
      stable_nonce: part.stableNonce,
    })),
  })
  if (error) throwRpcFailure(error)
  return rows(data).map(deliveryPartFromRow)
}

/** Acquire the per-conversation lease used by thread creation and delivery/retention fencing. */
export async function claimChatThreadLease(
  conversationId: string,
  leaseToken: string,
  leaseSeconds = 60,
): Promise<ChatThreadLease> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(leaseToken, 'Invalid delivery lease token.')
  validateLeaseSeconds(leaseSeconds)
  const { data, error } = await serviceClient().rpc('claim_chat_thread_lease', {
    p_conversation_id: conversationId,
    p_lease_token: leaseToken,
    p_lease_seconds: leaseSeconds,
  })
  if (error) throwRpcFailure(error)
  return threadLeaseFromRow(data)
}

export async function releaseChatThreadLease(conversationId: string, leaseToken: string): Promise<boolean> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(leaseToken, 'Invalid delivery lease token.')
  const { data, error } = await serviceClient().rpc('release_chat_thread_lease', {
    p_conversation_id: conversationId,
    p_lease_token: leaseToken,
  })
  if (error) throwRpcFailure(error)
  return data === true || (Array.isArray(data) && data[0] === true)
}

/** Begin one durable, bounded Discord thread setup/repair attempt. */
export async function beginChatThreadSetup(
  conversationId: string,
  threadLeaseToken: string,
): Promise<ChatDeliveryConversation> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(threadLeaseToken, 'Invalid delivery lease token.')
  const { data, error } = await serviceClient().rpc('begin_chat_thread_setup', {
    p_conversation_id: conversationId,
    p_thread_lease_token: threadLeaseToken,
  })
  if (error) throwRpcFailure(error)
  return deliveryConversationFromRow(data)
}

export interface ChatThreadSetupFinish {
  outcome: ChatDeliveryOutcome
  threadId?: string | null
  failureCode?: string | null
  nextRetryAt?: string | null
}

/** Fence one thread setup result and reset the budget only after validation. */
export async function finishChatThreadSetup(
  conversationId: string,
  threadLeaseToken: string,
  input: ChatThreadSetupFinish,
): Promise<ChatDeliveryConversation> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(threadLeaseToken, 'Invalid delivery lease token.')
  const parsedOutcome = chatDeliveryOutcomeSchema.safeParse(input.outcome)
  if (!parsedOutcome.success) throw new ChatDeliveryRepositoryError('Invalid thread setup outcome.', 400, 'invalid_request')
  const threadId = input.threadId ?? null
  const failureCode = input.failureCode ?? null
  validateSnowflake(threadId)
  validateSafeCode(failureCode)
  if (parsedOutcome.data === 'sent' && threadId === null) {
    throw new ChatDeliveryRepositoryError('Sent thread setup requires an id.', 400, 'invalid_request')
  }
  if (parsedOutcome.data !== 'sent' && (!failureCode || !input.nextRetryAt)) {
    throw new ChatDeliveryRepositoryError('Deferred thread setup requires retry metadata.', 400, 'invalid_request')
  }
  const { data, error } = await serviceClient().rpc('finish_chat_thread_setup', {
    p_conversation_id: conversationId,
    p_thread_lease_token: threadLeaseToken,
    p_outcome: parsedOutcome.data,
    p_thread_id: threadId,
    p_failure_code: failureCode,
    p_next_retry_at: input.nextRetryAt ?? null,
  })
  if (error) throwRpcFailure(error)
  return deliveryConversationFromRow(data)
}

/** Persist immutable starter reference/nonce before any Discord network call. */
export async function prepareChatStarterDelivery(
  conversationId: string,
  threadLeaseToken: string,
  stableReference: string,
  stableNonce: string,
): Promise<ChatStarterDelivery> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(threadLeaseToken, 'Invalid delivery lease token.')
  if (!stableReferencePattern.test(stableReference) || !stableNoncePattern.test(stableNonce)) {
    throw new ChatDeliveryRepositoryError('Invalid starter delivery identity.', 400, 'invalid_request')
  }
  const { data, error } = await serviceClient().rpc('prepare_chat_starter_delivery', {
    p_conversation_id: conversationId,
    p_thread_lease_token: threadLeaseToken,
    p_stable_reference: stableReference,
    p_stable_nonce: stableNonce,
  })
  if (error) throwRpcFailure(error)
  return starterFromRow(data)
}

export async function claimChatStarterDelivery(
  conversationId: string,
  threadLeaseToken: string,
  claimToken: string,
  leaseSeconds = 60,
): Promise<ChatStarterDelivery> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(threadLeaseToken, 'Invalid delivery lease token.')
  validateUuid(claimToken, 'Invalid starter claim token.')
  validateLeaseSeconds(leaseSeconds)
  const { data, error } = await serviceClient().rpc('claim_chat_starter_delivery', {
    p_conversation_id: conversationId,
    p_thread_lease_token: threadLeaseToken,
    p_claim_token: claimToken,
    p_lease_seconds: leaseSeconds,
  })
  if (error) throwRpcFailure(error)
  return starterFromRow(data)
}

export async function claimUncertainChatStarterDelivery(
  conversationId: string,
  threadLeaseToken: string,
  claimToken: string,
  leaseSeconds = 60,
): Promise<ChatStarterDelivery> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(threadLeaseToken, 'Invalid delivery lease token.')
  validateUuid(claimToken, 'Invalid starter claim token.')
  validateLeaseSeconds(leaseSeconds)
  const { data, error } = await serviceClient().rpc('claim_uncertain_chat_starter_delivery', {
    p_conversation_id: conversationId,
    p_thread_lease_token: threadLeaseToken,
    p_claim_token: claimToken,
    p_lease_seconds: leaseSeconds,
  })
  if (error) throwRpcFailure(error)
  return starterFromRow(data)
}

export interface ChatStarterDeliveryFinish {
  outcome: ChatDeliveryOutcome
  starterMessageId?: string | null
  failureCode?: string | null
  nextRetryAt?: string | null
}

export async function finishChatStarterDelivery(
  conversationId: string,
  threadLeaseToken: string,
  claimToken: string,
  input: ChatStarterDeliveryFinish,
): Promise<ChatStarterDelivery> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(threadLeaseToken, 'Invalid delivery lease token.')
  validateUuid(claimToken, 'Invalid starter claim token.')
  const parsedOutcome = chatDeliveryOutcomeSchema.safeParse(input.outcome)
  if (!parsedOutcome.success) throw new ChatDeliveryRepositoryError('Invalid starter delivery outcome.', 400, 'invalid_request')
  const starterMessageId = input.starterMessageId ?? null
  const failureCode = input.failureCode ?? null
  validateSnowflake(starterMessageId)
  validateSafeCode(failureCode)
  if (parsedOutcome.data === 'sent' && starterMessageId === null) {
    throw new ChatDeliveryRepositoryError('Sent starter delivery requires an id.', 400, 'invalid_request')
  }
  if (parsedOutcome.data === 'failed' && (!failureCode || !input.nextRetryAt)) {
    throw new ChatDeliveryRepositoryError('Failed starter delivery requires retry metadata.', 400, 'invalid_request')
  }
  const { data, error } = await serviceClient().rpc('finish_chat_starter_delivery', {
    p_conversation_id: conversationId,
    p_thread_lease_token: threadLeaseToken,
    p_claim_token: claimToken,
    p_outcome: parsedOutcome.data,
    p_starter_message_id: starterMessageId,
    p_failure_code: failureCode,
    p_next_retry_at: input.nextRetryAt ?? null,
  })
  if (error) throwRpcFailure(error)
  return starterFromRow(data)
}

/** Persist Start Thread from Message's invariant: the thread id equals the starter message id. */
export async function saveChatThreadId(
  conversationId: string,
  threadLeaseToken: string,
  threadId: string,
): Promise<ChatStarterDelivery> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(threadLeaseToken, 'Invalid delivery lease token.')
  validateSnowflake(threadId, false)
  const { data, error } = await serviceClient().rpc('save_chat_thread_id', {
    p_conversation_id: conversationId,
    p_thread_lease_token: threadLeaseToken,
    p_thread_id: threadId,
  })
  if (error) throwRpcFailure(error)
  return starterFromRow(data)
}

export async function claimNextChatDeliveryPart(
  conversationId: string,
  conversationLeaseToken: string,
  claimToken: string,
  leaseSeconds = 60,
): Promise<ChatDeliveryPart | null> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(conversationLeaseToken, 'Invalid delivery lease token.')
  validateUuid(claimToken, 'Invalid message claim token.')
  validateLeaseSeconds(leaseSeconds)
  const { data, error } = await serviceClient().rpc('claim_next_chat_delivery_part', {
    p_conversation_id: conversationId,
    p_conversation_lease_token: conversationLeaseToken,
    p_claim_token: claimToken,
    p_lease_seconds: leaseSeconds,
  })
  if (error) throwRpcFailure(error)
  return data == null ? null : deliveryPartFromRow(data)
}

/** Staff/manual retries bypass next_retry_at but still obey ordering and attempt caps. */
export async function retryClaimChatDeliveryPart(
  conversationId: string,
  conversationLeaseToken: string,
  claimToken: string,
  leaseSeconds = 60,
): Promise<ChatDeliveryPart | null> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(conversationLeaseToken, 'Invalid delivery lease token.')
  validateUuid(claimToken, 'Invalid message claim token.')
  validateLeaseSeconds(leaseSeconds)
  const { data, error } = await serviceClient().rpc('retry_claim_chat_delivery_part', {
    p_conversation_id: conversationId,
    p_conversation_lease_token: conversationLeaseToken,
    p_claim_token: claimToken,
    p_lease_seconds: leaseSeconds,
  })
  if (error) throwRpcFailure(error)
  return data == null ? null : deliveryPartFromRow(data)
}

export async function claimUncertainChatDeliveryPart(
  conversationId: string,
  conversationLeaseToken: string,
  partId: string,
  claimToken: string,
  leaseSeconds = 60,
): Promise<ChatDeliveryPart> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(conversationLeaseToken, 'Invalid delivery lease token.')
  validateUuid(partId, 'Invalid message part id.')
  validateUuid(claimToken, 'Invalid message claim token.')
  validateLeaseSeconds(leaseSeconds)
  const { data, error } = await serviceClient().rpc('claim_uncertain_chat_delivery_part', {
    p_conversation_id: conversationId,
    p_conversation_lease_token: conversationLeaseToken,
    p_part_id: partId,
    p_claim_token: claimToken,
    p_lease_seconds: leaseSeconds,
  })
  if (error) throwRpcFailure(error)
  return deliveryPartFromRow(data)
}

export interface ChatDeliveryPartFinish {
  outcome: ChatDeliveryOutcome
  discordMessageId?: string | null
  failureCode?: string | null
  nextRetryAt?: string | null
}

export async function finishChatDeliveryPart(
  conversationId: string,
  conversationLeaseToken: string,
  partId: string,
  claimToken: string,
  input: ChatDeliveryPartFinish,
): Promise<ChatDeliveryPart> {
  validateUuid(conversationId, 'Invalid conversation id.')
  validateUuid(conversationLeaseToken, 'Invalid delivery lease token.')
  validateUuid(partId, 'Invalid message part id.')
  validateUuid(claimToken, 'Invalid message claim token.')
  const parsedOutcome = chatDeliveryOutcomeSchema.safeParse(input.outcome)
  if (!parsedOutcome.success) throw new ChatDeliveryRepositoryError('Invalid message delivery outcome.', 400, 'invalid_request')
  const discordMessageId = input.discordMessageId ?? null
  const failureCode = input.failureCode ?? null
  validateSnowflake(discordMessageId)
  validateSafeCode(failureCode)
  if (parsedOutcome.data === 'sent' && discordMessageId === null) {
    throw new ChatDeliveryRepositoryError('Sent message delivery requires an id.', 400, 'invalid_request')
  }
  if (parsedOutcome.data === 'failed' && (!failureCode || !input.nextRetryAt)) {
    throw new ChatDeliveryRepositoryError('Failed message delivery requires retry metadata.', 400, 'invalid_request')
  }
  const { data, error } = await serviceClient().rpc('finish_chat_delivery_part', {
    p_conversation_id: conversationId,
    p_conversation_lease_token: conversationLeaseToken,
    p_part_id: partId,
    p_claim_token: claimToken,
    p_outcome: parsedOutcome.data,
    p_discord_message_id: discordMessageId,
    p_failure_code: failureCode,
    p_next_retry_at: input.nextRetryAt ?? null,
  })
  if (error) throwRpcFailure(error)
  return deliveryPartFromRow(data)
}

/** Return pending/definite-failed parts without exposing message bodies. */
export async function listChatDeliveryRetryCandidates(limit = 50): Promise<ChatDeliveryPart[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ChatDeliveryRepositoryError('Invalid delivery pagination.', 400, 'invalid_request')
  }
  const { data, error } = await serviceClient()
    .from('chat_message_parts')
    .select('*')
    .in('state', ['pending', 'failed'])
    .order('created_at', { ascending: true })
    .order('message_id', { ascending: true })
    .order('part_index', { ascending: true })
    .limit(limit)
  if (error) throw new ChatDeliveryRepositoryError('Chat storage is temporarily unavailable.')
  return rows(data).map(deliveryPartFromRow)
}

/** Enumerate all body-free delivery recovery work, including unprepared messages and uncertain claims. */
export async function listChatDeliveryWorkCandidates(limit = 50): Promise<ChatDeliveryWorkCandidate[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ChatDeliveryRepositoryError('Invalid delivery pagination.', 400, 'invalid_request')
  }
  const { data, error } = await serviceClient().rpc('list_chat_delivery_work_candidates', {
    p_limit: limit,
  })
  if (error) throwRpcFailure(error)
  return rows(data).map(deliveryWorkCandidateFromRow)
}

/** Enumerate one conversation's work without starvation from an unrelated global backlog. */
export async function listChatDeliveryWorkCandidatesForConversation(
  conversationId: string,
  limit = 50,
): Promise<ChatDeliveryWorkCandidate[]> {
  validateUuid(conversationId, 'Invalid conversation id.')
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ChatDeliveryRepositoryError('Invalid delivery pagination.', 400, 'invalid_request')
  }
  const { data, error } = await serviceClient().rpc('list_chat_delivery_work_candidates_for_conversation', {
    p_conversation_id: conversationId,
    p_limit: limit,
  })
  if (error) throwRpcFailure(error)
  return rows(data).map(deliveryWorkCandidateFromRow)
}

/** Prepare body-free deletion records and cascade only eligible terminal conversations. */
export async function prepareChatRetentionCleanup(input: ChatCleanupPreparation): Promise<ChatCleanupJob[]> {
  const parsed = chatCleanupPreparationSchema.safeParse(input)
  if (!parsed.success) throw new ChatDeliveryRepositoryError('Invalid retention cleanup request.', 400, 'invalid_request')
  const { data, error } = await serviceClient().rpc('prepare_chat_retention_cleanup', {
    p_guild_id: parsed.data.guildId,
    p_parent_channel_id: parsed.data.parentChannelId,
    p_cutoff: parsed.data.cutoff,
    p_limit: parsed.data.limit,
  })
  if (error) throwRpcFailure(error)
  return rows(data).map(cleanupFromRow)
}

export async function listChatCleanupJobs(limit = 50): Promise<ChatCleanupJob[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ChatDeliveryRepositoryError('Invalid cleanup pagination.', 400, 'invalid_request')
  }
  const { data, error } = await serviceClient().rpc('list_chat_cleanup_jobs', {
    p_limit: limit,
  })
  if (error) throwRpcFailure(error)
  return rows(data).map(cleanupFromRow)
}

export async function claimChatCleanupJob(jobId: string, claimToken: string, leaseSeconds = 60): Promise<ChatCleanupJob> {
  validateUuid(jobId, 'Invalid cleanup job id.')
  validateUuid(claimToken, 'Invalid cleanup claim token.')
  validateLeaseSeconds(leaseSeconds)
  const { data, error } = await serviceClient().rpc('claim_chat_cleanup_job', {
    p_job_id: jobId,
    p_claim_token: claimToken,
    p_lease_seconds: leaseSeconds,
  })
  if (error) throwRpcFailure(error)
  return cleanupFromRow(data)
}

export async function claimUncertainChatCleanupJob(jobId: string, claimToken: string, leaseSeconds = 60): Promise<ChatCleanupJob> {
  validateUuid(jobId, 'Invalid cleanup job id.')
  validateUuid(claimToken, 'Invalid cleanup claim token.')
  validateLeaseSeconds(leaseSeconds)
  const { data, error } = await serviceClient().rpc('claim_uncertain_chat_cleanup_job', {
    p_job_id: jobId,
    p_claim_token: claimToken,
    p_lease_seconds: leaseSeconds,
  })
  if (error) throwRpcFailure(error)
  return cleanupFromRow(data)
}

export interface ChatCleanupJobFinish {
  outcome: 'succeeded' | 'uncertain' | 'failed'
  failureCode?: string | null
  nextRetryAt?: string | null
}

export async function finishChatCleanupJob(
  jobId: string,
  claimToken: string,
  input: ChatCleanupJobFinish,
): Promise<ChatCleanupJob> {
  validateUuid(jobId, 'Invalid cleanup job id.')
  validateUuid(claimToken, 'Invalid cleanup claim token.')
  if (!['succeeded', 'uncertain', 'failed'].includes(input.outcome)) {
    throw new ChatDeliveryRepositoryError('Invalid cleanup outcome.', 400, 'invalid_request')
  }
  const failureCode = input.failureCode ?? null
  validateSafeCode(failureCode)
  if (input.outcome === 'failed' && (!failureCode || !input.nextRetryAt)) {
    throw new ChatDeliveryRepositoryError('Failed cleanup requires retry metadata.', 400, 'invalid_request')
  }
  const { data, error } = await serviceClient().rpc('finish_chat_cleanup_job', {
    p_job_id: jobId,
    p_claim_token: claimToken,
    p_outcome: input.outcome,
    p_failure_code: failureCode,
    p_next_retry_at: input.nextRetryAt ?? null,
  })
  if (error) throwRpcFailure(error)
  return cleanupFromRow(data)
}

// Names used by the bridge read naturally while retaining one implementation.
export const ensureChatMessageParts = prepareChatMessageParts
export const claimMessageDelivery = claimNextChatDeliveryPart
export const claimChatDeliveryPart = claimNextChatDeliveryPart
export const finishMessageDelivery = finishChatDeliveryPart
export const listDeliveryRetryCandidates = listChatDeliveryRetryCandidates
export const listDeliveryWorkCandidates = listChatDeliveryWorkCandidates
export const prepareRetentionCleanup = prepareChatRetentionCleanup
