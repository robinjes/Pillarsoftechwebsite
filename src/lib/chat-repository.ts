import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  CHAT_MAX_PAGE_SIZE,
  CHAT_TIME_ZONE,
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

const messageSelect = 'id,conversation_id,sender,body,delivery_status,created_at'
const digestPattern = /^[0-9a-f]{64}$/

export type ChatRepositoryRouteCode =
  | 'chat_closed'
  | 'conversation_not_found'
  | 'chat_unavailable'

export class ChatRepositoryError extends Error {
  readonly status: 400 | 404 | 409 | 503
  readonly routeCode: ChatRepositoryRouteCode

  constructor(
    message: string,
    status: 400 | 404 | 409 | 503 = 503,
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

/** Write ownership is intentionally stricter than transcript read ownership. */
async function ownedWritableConversation(
  client: SupabaseClient,
  conversationId: string,
  digest: string,
  now = new Date(),
): Promise<ChatConversationRecord> {
  const conversation = await ownedReadableConversation(client, conversationId, digest, now)
  if (conversation.status !== 'open') {
    throw new ChatRepositoryError('Chat conversation is closed.', 409, 'chat_closed')
  }
  return conversation
}

/**
 * Read schedule and queue state through the service role. A missing or
 * malformed row is represented as a closed availability result; database
 * failures remain a generic repository error for the route to redact.
 */
export async function getStoredChatAvailability(now = new Date()): Promise<ChatAvailability> {
  const client = serviceClient()
  const [scheduleResult, queueResult] = await Promise.all([
    client
      .from('chat_office_hours')
      .select('id,weekday,open_time,close_time,timezone,enabled')
      .eq('enabled', true)
      .order('weekday', { ascending: true }),
    client
      .from('chat_queue_state')
      .select('id,queue_open,updated_at')
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
      updatedAt: safeString((queueResult.data as Record<string, unknown>).updated_at),
    })
    : null

  // A missing singleton must never open the queue. Any malformed or missing
  // schedule row invalidates the complete schedule so a partial config cannot
  // accidentally make one weekday appear live.
  const queueOpen = queue?.success ? queue.data.queueOpen : false
  return getChatAvailability(
    now,
    { queueOpen },
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
  now = new Date(),
): Promise<{ conversation: ChatConversationRecord; resumed: boolean }> {
  validDigest(digest)
  const existing = await getChatConversationForVisitor(digest, undefined, now)
  if (existing && existing.status === 'open') return { conversation: existing, resumed: true }

  const client = serviceClient()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000).toISOString()
  const { data, error } = await client
    .from('chat_conversations')
    .insert({
      visitor_token_digest: digest,
      display_name: input.displayName,
      email: input.email,
      is_under_13: input.isUnder13,
      guardian_attested: input.guardianAttested,
      status: 'open',
      ownership_expires_at: expiresAt,
      discord_delivery_status: 'pending',
    })
    .select(conversationSelect)
    .single()
  if (error) {
    // Two first requests with the same nonce can race between the initial
    // owner lookup and this insert. The digest uniqueness constraint is the
    // serialization point; recover only that expected conflict by reading
    // the same unexpired open conversation.
    if (errorCode(error) === '23505') {
      const resumed = await getChatConversationForVisitor(digest, undefined, now)
      if (resumed?.status === 'open') return { conversation: resumed, resumed: true }
    }
    throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  }
  if (!data) throw new ChatRepositoryError('Chat storage is temporarily unavailable.', 503)
  return { conversation: conversationFromRow(data as unknown as Record<string, unknown>), resumed: false }
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

/** Persist visitor text as pending delivery; Task 4B owns Discord delivery. */
export async function insertChatMessageForVisitor(
  conversation: Pick<ChatConversationRecord, 'id'>,
  digest: string,
  body: string,
  now = new Date(),
): Promise<ChatMessageRecord> {
  validDigest(digest)
  const client = serviceClient()
  await ownedWritableConversation(client, conversation.id, digest, now)

  const { data, error } = await client.rpc('insert_chat_visitor_message', {
    p_conversation_id: conversation.id,
    p_visitor_token_digest: digest,
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
