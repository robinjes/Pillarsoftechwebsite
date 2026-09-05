import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  CHAT_MAX_PAGE_SIZE,
  CHAT_MESSAGE_ID_CONFLICT_ERROR,
  CHAT_TIME_ZONE,
  CHAT_UNDER_13_ERROR,
  chatConversationRecordSchema,
  chatConversationStatusSchema,
  chatDeliveryStatusSchema,
  chatMessageRecordSchema,
  chatOfficeHourSchema,
  chatQueueStateSchema,
  type ChatAvailability,
  type ChatConversationCreate,
  type ChatConversationRecord,
  type ChatCursorPayload,
  type ChatMessageRecord,
} from '@/lib/chat-contracts'
import { getChatAvailability } from '@/lib/chat-availability'
import { isChatLiveConfigured } from '@/lib/chat-config'
import { decodeChatCursor, encodeChatCursor } from '@/lib/chat-pagination'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

const conversationSelect = [
  'id',
  'display_name',
  'email',
  'status',
  'ownership_expires_at',
  'terminal_at',
  'discord_thread_id',
  'discord_delivery_status',
  'created_at',
  'updated_at',
].join(',')

const messageSelect = 'id,conversation_id,client_message_id,sender,body,delivery_status,created_at'
const digestPattern = /^[0-9a-f]{64}$/

export type ChatRepositoryRouteCode =
  | 'chat_closed'
  | 'conversation_not_found'
  | 'under_13_requires_guardian'
  | 'message_id_conflict'
  | 'chat_unavailable'

export class ChatRepositoryError extends Error {
  readonly status: 400 | 403 | 404 | 409 | 503
  readonly routeCode: ChatRepositoryRouteCode

  constructor(
    message: string,
    status: 400 | 403 | 404 | 409 | 503 = 503,
    routeCode: ChatRepositoryRouteCode = 'chat_unavailable',
  ) {
    super(message)
    this.name = 'ChatRepositoryError'
    this.status = status
    this.routeCode = routeCode
  }
}

function serviceClient(): SupabaseClient {
  try {
    return createSupabaseServiceRoleClient()
  } catch {
    throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  }
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
    : []
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function optionalString(value: unknown): string | null {
  return value == null ? null : safeString(value)
}

function conversationFromRow(row: Record<string, unknown>): ChatConversationRecord {
  const parsed = chatConversationRecordSchema.safeParse({
    id: safeString(row.id),
    displayName: safeString(row.display_name),
    email: safeString(row.email),
    status: row.status,
    ownershipExpiresAt: safeString(row.ownership_expires_at),
    terminalAt: row.terminal_at == null ? null : safeString(row.terminal_at),
    discordThreadId: optionalString(row.discord_thread_id),
    discordStarterMessageId: optionalString(row.discord_starter_message_id),
    discordDeliveryStatus: row.discord_delivery_status,
    createdAt: safeString(row.created_at),
    updatedAt: safeString(row.updated_at),
  })
  if (!parsed.success) throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  return parsed.data
}

function messageFromRow(row: Record<string, unknown>): ChatMessageRecord {
  const parsed = chatMessageRecordSchema.safeParse({
    id: safeString(row.id),
    conversationId: safeString(row.conversation_id),
    clientMessageId: row.client_message_id == null ? null : safeString(row.client_message_id),
    sender: row.sender,
    body: safeString(row.body),
    deliveryStatus: row.delivery_status,
    createdAt: safeString(row.created_at),
  })
  if (!parsed.success) throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  return parsed.data
}

function validDigest(digest: string): void {
  if (!digestPattern.test(digest)) throw new ChatRepositoryError('Chat ownership is unavailable.', 503)
}

function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : ''
}

function throwRpcFailure(error: unknown): never {
  switch (errorCode(error)) {
    case 'P0002':
      throw new ChatRepositoryError('Chat conversation was not found.', 404, 'conversation_not_found')
    case 'P0003':
      throw new ChatRepositoryError('Chat conversation is closed.', 409, 'chat_closed')
    case 'P0004':
      throw new ChatRepositoryError(CHAT_UNDER_13_ERROR, 403, 'under_13_requires_guardian')
    case 'P0005':
      throw new ChatRepositoryError(CHAT_MESSAGE_ID_CONFLICT_ERROR, 409, 'message_id_conflict')
    case '22023':
      throw new ChatRepositoryError('Invalid chat message.', 400)
    default:
      throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  }
}

function isUnexpired(conversation: ChatConversationRecord, now = new Date()): boolean {
  const expiry = Date.parse(conversation.ownershipExpiresAt)
  return Number.isFinite(expiry) && expiry > now.getTime()
}

function validPageSize(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > CHAT_MAX_PAGE_SIZE) {
    throw new ChatRepositoryError('Invalid chat pagination.', 400)
  }
}

/** Defense in depth for callers that use the repository outside the routes. */
async function ownedReadableConversation(
  client: SupabaseClient,
  conversationId: string,
  digest: string,
  now = new Date(),
): Promise<ChatConversationRecord> {
  const { data, error } = await client
    .from('chat_conversations')
    .select(conversationSelect)
    .eq('id', conversationId)
    .eq('visitor_token_digest', digest)
    .maybeSingle()
  if (error) throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  if (!data) throw new ChatRepositoryError('Chat conversation was not found.', 404, 'conversation_not_found')
  const conversation = conversationFromRow(data as unknown as Record<string, unknown>)
  if (!isUnexpired(conversation, now)) {
    throw new ChatRepositoryError('Chat conversation was not found.', 404, 'conversation_not_found')
  }
  if (conversation.status === 'spam') {
    throw new ChatRepositoryError('Chat conversation was not found.', 404, 'conversation_not_found')
  }
  return conversation
}

/**
 * Read schedule and queue state through the service role. A missing or
 * malformed row is represented as a closed availability result; database
 * failures remain a generic repository error for the route to redact.
 */
export async function getStoredChatAvailability(now = new Date()): Promise<ChatAvailability> {
  // Configuration is an explicit feature gate. Do not touch the database when
  // chat is disabled or partially configured; this keeps the public route
  // fail-closed even on a server that has only the older schema deployed.
  if (!isChatLiveConfigured()) {
    return getChatAvailability(now, { queueOpen: false, queueExpiresAt: null }, [])
  }

  const client = serviceClient()
  const [scheduleResult, queueResult] = await Promise.all([
    client
      .from('chat_office_hours')
      .select('id,weekday,open_time,close_time,timezone,enabled')
      .eq('enabled', true)
      .order('weekday', { ascending: true }),
    client
      .from('chat_queue_state')
      .select('id,queue_open,queue_expires_at,updated_at')
      .limit(1)
      .maybeSingle(),
  ])

  if (scheduleResult.error || queueResult.error) {
    throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  }

  const rawScheduleRows = rows(scheduleResult.data)
  const parsedSchedule = rawScheduleRows.flatMap((row) => {
    const parsed = chatOfficeHourSchema.safeParse({
      id: safeString(row.id),
      weekday: Number(row.weekday),
      openTime: safeString(row.open_time),
      closeTime: safeString(row.close_time),
      timezone: safeString(row.timezone),
      enabled: row.enabled,
    })
    return parsed.success ? [parsed.data] : []
  })
  const queue = queueResult.data && typeof queueResult.data === 'object' && !Array.isArray(queueResult.data)
    ? chatQueueStateSchema.safeParse({
      id: safeString((queueResult.data as Record<string, unknown>).id),
      queueOpen: (queueResult.data as Record<string, unknown>).queue_open,
      queueExpiresAt: (queueResult.data as Record<string, unknown>).queue_expires_at == null
        ? null
        : safeString((queueResult.data as Record<string, unknown>).queue_expires_at),
      updatedAt: safeString((queueResult.data as Record<string, unknown>).updated_at),
    })
    : null

  // A missing singleton must never open the queue. Any malformed or missing
  // schedule row invalidates the complete schedule so a partial config cannot
  // accidentally make one weekday appear live.
  const queueOpen = queue?.success ? queue.data.queueOpen : false
  return getChatAvailability(
    now,
    { queueOpen, queueExpiresAt: queue?.success ? queue.data.queueExpiresAt : null },
    parsedSchedule.length === rawScheduleRows.length ? parsedSchedule : [],
  )
}

/** Find a conversation only when both the id (if supplied) and owner digest match. */
export async function getChatConversationForVisitor(
  digest: string,
  conversationId?: string,
  now = new Date(),
): Promise<ChatConversationRecord | null> {
  validDigest(digest)
  const client = serviceClient()
  let query = client
    .from('chat_conversations')
    .select(conversationSelect)
    .eq('visitor_token_digest', digest)
  if (conversationId) query = query.eq('id', conversationId)
  const { data, error } = await query.maybeSingle()
  if (error) throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  if (!data) return null
  const conversation = conversationFromRow(data as unknown as Record<string, unknown>)
  return isUnexpired(conversation, now) ? conversation : null
}

export async function createChatConversation(
  input: ChatConversationCreate,
  digest: string,
  _now = new Date(),
): Promise<{ conversation: ChatConversationRecord; resumed: boolean }> {
  // Retained as a compatibility parameter for deterministic callers; the
  // production RPC intentionally uses database clock_timestamp().
  void _now
  validDigest(digest)
  if (input.isUnder13) {
    throw new ChatRepositoryError(CHAT_UNDER_13_ERROR, 403, 'under_13_requires_guardian')
  }

  const client = serviceClient()
  const { data, error } = await client.rpc('insert_chat_visitor_conversation', {
    p_visitor_token_digest: digest,
    p_display_name: input.displayName,
    p_email: input.email,
    p_is_under_13: input.isUnder13,
    p_guardian_attested: input.guardianAttested,
  })
  if (error) throwRpcFailure(error)
  const result = Array.isArray(data) ? data[0] : data
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  }
  const resultRow = result as Record<string, unknown>
  return {
    conversation: conversationFromRow(resultRow),
    resumed: resultRow.resumed === true,
  }
}

/** Read bounded visitor messages in chronological keyset order. */
export async function listChatMessagesForVisitor(
  conversation: Pick<ChatConversationRecord, 'id'>,
  digest: string,
  cursor: ChatCursorPayload | null = null,
  limit = CHAT_MAX_PAGE_SIZE,
): Promise<{ messages: ChatMessageRecord[]; nextCursor: string | null }> {
  validDigest(digest)
  validPageSize(limit)
  const client = serviceClient()
  await ownedReadableConversation(client, conversation.id, digest)
  let query = client
    .from('chat_messages')
    .select(messageSelect)
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit + 1)
  if (cursor) {
    query = query.or(`created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`)
  }
  const { data, error } = await query
  if (error) throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  const pageRows = rows(data)
  const hasNextPage = pageRows.length > limit
  const messages = pageRows.slice(0, limit).map(messageFromRow)
  const last = messages[messages.length - 1]
  return { messages, nextCursor: hasNextPage && last ? encodeChatCursor(last.createdAt, last.id) : null }
}

/**
 * Look up a visitor's idempotency key before a new send spends availability or
 * rate-limit budget. This is deliberately owner-scoped and body-aware: an
 * exact replay can be returned after the queue closes, while a reused key
 * with a different body is a stable conflict.
 */
export async function getChatMessageForVisitor(
  conversation: Pick<ChatConversationRecord, 'id'>,
  digest: string,
  clientMessageId: string,
  body: string,
): Promise<ChatMessageRecord | null> {
  validDigest(digest)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientMessageId)) {
    throw new ChatRepositoryError('Invalid chat message.', 400)
  }
  const client = serviceClient()
  await ownedReadableConversation(client, conversation.id, digest)
  const { data, error } = await client
    .from('chat_messages')
    .select(messageSelect)
    .eq('conversation_id', conversation.id)
    .eq('client_message_id', clientMessageId)
    .maybeSingle()
  if (error) throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  if (!data) return null
  const message = messageFromRow(data as unknown as Record<string, unknown>)
  if (message.sender !== 'visitor' || message.body !== body.trim()) {
    throw new ChatRepositoryError(CHAT_MESSAGE_ID_CONFLICT_ERROR, 409, 'message_id_conflict')
  }
  return message
}

/** Persist visitor text as pending delivery; Task 4B owns Discord delivery. */
export async function insertChatMessageForVisitor(
  conversation: Pick<ChatConversationRecord, 'id'>,
  digest: string,
  body: string,
  clientMessageId: string,
  now = new Date(),
): Promise<ChatMessageRecord> {
  validDigest(digest)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientMessageId)) {
    throw new ChatRepositoryError('Invalid chat message.', 400)
  }
  const client = serviceClient()
  // The RPC remains authoritative for a new send. A readable terminal owner
  // is intentionally allowed through this preflight so an exact idempotent
  // retry can return its original row after closure; a fresh body still gets
  // the atomic `chat_closed` result from the database.
  await ownedReadableConversation(client, conversation.id, digest, now)

  const { data, error } = await client.rpc('insert_chat_visitor_message', {
    p_conversation_id: conversation.id,
    p_visitor_token_digest: digest,
    p_client_message_id: clientMessageId,
    p_body: body,
  })
  if (error) throwRpcFailure(error)
  const result = Array.isArray(data) ? data[0] : data
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  }
  return messageFromRow(result as Record<string, unknown>)
}

/** Exposed for Task 4B retry code; status values are checked before writes. */
export async function updateChatDeliveryStatus(
  messageId: string,
  status: 'pending' | 'sent' | 'failed',
  redactedError: string | null = null,
): Promise<void> {
  if (!chatDeliveryStatusSchema.safeParse(status).success || !/^[0-9a-f-]{36}$/i.test(messageId)) {
    throw new ChatRepositoryError('Invalid chat delivery update.', 400)
  }
  const client = serviceClient()
  const { error } = await client
    .from('chat_messages')
    .update({ delivery_status: status, delivery_error: redactedError })
    .eq('id', messageId)
  if (error) throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
}

export function decodeVisitorChatCursor(value: unknown): ChatCursorPayload | null {
  return decodeChatCursor(value)
}

export function isActiveChatStatus(value: unknown): value is 'open' {
  return chatConversationStatusSchema.safeParse(value).success && value === 'open'
}

export const CHAT_REPOSITORY_TIME_ZONE = CHAT_TIME_ZONE
