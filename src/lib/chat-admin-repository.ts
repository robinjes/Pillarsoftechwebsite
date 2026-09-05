import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  chatAdminConversationListSchema,
  chatAdminConversationSchema,
  chatAdminMessageSchema,
  chatAdminQueueStateSchema,
  chatAdminReplySchema,
  chatAdminTerminalSchema,
  chatAdminTranscriptPageSchema,
  chatAdminQueueUpdateSchema,
  type ChatAdminConversation,
  type ChatAdminConversationListInput,
  type ChatAdminConversationPage,
  type ChatAdminMessage,
  type ChatAdminQueueState,
  type ChatAdminQueueUpdateInput,
  type ChatAdminReplyInput,
  type ChatAdminTerminalInput,
  type ChatAdminTranscriptPage,
} from '@/lib/chat-admin-contracts'
import { decodeChatCursor, encodeChatCursor } from '@/lib/chat-pagination'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

const conversationSelect = [
  'id',
  'display_name',
  'email',
  'is_under_13',
  'guardian_attested',
  'status',
  'ownership_expires_at',
  'terminal_at',
  'discord_thread_id',
  'discord_starter_message_id',
  'discord_delivery_status',
  'created_at',
  'updated_at',
].join(',')

const messageSelect = [
  'id',
  'conversation_id',
  'client_message_id',
  'staff_message_id',
  'author_user_id',
  'sender',
  'body',
  'delivery_status',
  'source_interaction_id',
  'created_at',
].join(',')

export type ChatAdminRepositoryErrorCode =
  | 'invalid_request'
  | 'conversation_not_found'
  | 'message_not_found'
  | 'chat_conflict'
  | 'staff_authorization_unavailable'
  | 'delivery_lease_unavailable'
  | 'chat_unavailable'

export class ChatAdminRepositoryError extends Error {
  readonly status: 400 | 403 | 404 | 409 | 503
  readonly routeCode: ChatAdminRepositoryErrorCode

  constructor(
    message: string,
    status: 400 | 403 | 404 | 409 | 503 = 503,
    routeCode: ChatAdminRepositoryErrorCode = 'chat_unavailable',
  ) {
    super(message)
    this.name = 'ChatAdminRepositoryError'
    this.status = status
    this.routeCode = routeCode
  }
}

function serviceClient(): SupabaseClient {
  try {
    return createSupabaseServiceRoleClient()
  } catch {
    throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
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

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function nullableText(value: unknown): string | null {
  return value == null ? null : text(value)
}

function resultRow(value: unknown): Record<string, unknown> {
  const result = Array.isArray(value) ? value[0] : value
  return result && typeof result === 'object' && !Array.isArray(result)
    ? result as Record<string, unknown>
    : {}
}

function adminConversationFromRow(row: Record<string, unknown>): ChatAdminConversation {
  const parsed = chatAdminConversationSchema.safeParse({
    id: text(row.id),
    displayName: text(row.display_name),
    email: text(row.email),
    isUnder13: row.is_under_13,
    guardianAttested: row.guardian_attested,
    status: row.status,
    ownershipExpiresAt: text(row.ownership_expires_at),
    terminalAt: row.terminal_at == null ? null : text(row.terminal_at),
    discordThreadId: nullableText(row.discord_thread_id),
    discordStarterMessageId: nullableText(row.discord_starter_message_id),
    discordDeliveryStatus: row.discord_delivery_status,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  })
  if (!parsed.success) throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

function adminMessageFromRow(row: Record<string, unknown>): ChatAdminMessage {
  const parsed = chatAdminMessageSchema.safeParse({
    id: text(row.id),
    conversationId: text(row.conversation_id),
    clientMessageId: row.client_message_id == null ? null : text(row.client_message_id),
    staffMessageId: row.staff_message_id == null ? null : text(row.staff_message_id),
    authorUserId: row.author_user_id == null ? null : text(row.author_user_id),
    sender: row.sender,
    body: text(row.body),
    deliveryStatus: row.delivery_status,
    sourceInteractionId: row.source_interaction_id == null ? null : text(row.source_interaction_id),
    createdAt: text(row.created_at),
  })
  if (!parsed.success) throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

function adminQueueFromRow(row: Record<string, unknown>): ChatAdminQueueState {
  const parsed = chatAdminQueueStateSchema.safeParse({
    id: text(row.id),
    queueOpen: row.queue_open,
    queueExpiresAt: row.queue_expires_at == null ? null : text(row.queue_expires_at),
    updatedAt: text(row.updated_at),
  })
  if (!parsed.success) throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
  return parsed.data
}

function throwRpcFailure(error: unknown): never {
  switch (errorCode(error)) {
    case 'P0002':
      throw new ChatAdminRepositoryError('Chat conversation was not found.', 404, 'conversation_not_found')
    case 'P0006':
    case 'P0008':
      throw new ChatAdminRepositoryError('Staff authorization is temporarily unavailable.', 403, 'staff_authorization_unavailable')
    case 'P0007':
    case 'P0010':
      throw new ChatAdminRepositoryError('Chat delivery is busy or requires reconciliation.', 409, 'delivery_lease_unavailable')
    case 'P0005':
      throw new ChatAdminRepositoryError('Chat operation conflicts with an earlier action.', 409, 'chat_conflict')
    case 'P0009':
    case '22023':
      throw new ChatAdminRepositoryError('Invalid chat administration request.', 400, 'invalid_request')
    case 'P0003':
      throw new ChatAdminRepositoryError('Chat conversation is closed.', 409, 'chat_conflict')
    default:
      throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
  }
}

function validateActor(actorUserId: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(actorUserId)) {
    throw new ChatAdminRepositoryError('Invalid staff authorization.', 403, 'staff_authorization_unavailable')
  }
}

function decodeAdminCursor(value: string | null | undefined): { createdAt: string; id: string } | null {
  if (value == null) return null
  const cursor = decodeChatCursor(value)
  if (!cursor) throw new ChatAdminRepositoryError('Invalid chat pagination.', 400, 'invalid_request')
  return cursor
}

function escapedSearch(value: string): string {
  // The contract limits this to plain text.  Keep an additional defensive
  // filter here so a future caller cannot add PostgREST OR delimiters.
  return value.replace(/[(),%_*\\]/gu, '').trim().slice(0, 160)
}

/** List newest conversations first using bounded keyset pagination. */
export async function listChatConversationsForStaff(
  input: ChatAdminConversationListInput = { limit: 50 },
): Promise<ChatAdminConversationPage> {
  const parsedInput = chatAdminConversationListSchema.safeParse(input)
  if (!parsedInput.success) throw new ChatAdminRepositoryError('Invalid chat administration request.', 400, 'invalid_request')
  const { status, search, cursor: cursorValue, limit } = parsedInput.data
  const cursor = decodeAdminCursor(cursorValue)
  const client = serviceClient()
  let query = client
    .from('chat_conversations')
    .select(conversationSelect, { count: 'exact' })
  if (status) query = query.eq('status', status)
  const safeSearch = search ? escapedSearch(search) : ''
  const cursorFilter = cursor
    ? `or(created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id}))`
    : ''
  const searchFilter = safeSearch
    ? `or(display_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%)`
    : ''
  if (searchFilter && cursorFilter) query = query.or(`and(${searchFilter},${cursorFilter})`)
  else if (searchFilter) query = query.or(searchFilter)
  else if (cursorFilter) query = query.or(cursorFilter)
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)
  if (error) throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
  const pageRows = rows(data)
  const hasNextPage = pageRows.length > limit
  const conversations = pageRows.slice(0, limit).map(adminConversationFromRow)
  const last = conversations[conversations.length - 1]
  return {
    conversations,
    nextCursor: hasNextPage && last ? encodeChatCursor(last.createdAt, last.id) : null,
  }
}

/** Read a bounded staff transcript page; message bodies are returned only to a verified staff route. */
export async function listChatMessagesForStaff(
  conversationId: string,
  cursorValue: string | null = null,
  limit = 50,
): Promise<ChatAdminTranscriptPage> {
  if (!/^[0-9a-f-]{36}$/iu.test(conversationId) || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ChatAdminRepositoryError('Invalid chat administration request.', 400, 'invalid_request')
  }
  const cursor = decodeAdminCursor(cursorValue)
  const client = serviceClient()
  const conversationResult = await client
    .from('chat_conversations')
    .select('id')
    .eq('id', conversationId)
    .maybeSingle()
  if (conversationResult.error) throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
  if (!conversationResult.data) throw new ChatAdminRepositoryError('Chat conversation was not found.', 404, 'conversation_not_found')

  let query = client
    .from('chat_messages')
    .select(messageSelect)
    .eq('conversation_id', conversationId)
  if (cursor) query = query.or(`created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`)
  const { data, error } = await query
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit + 1)
  if (error) throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
  const pageRows = rows(data)
  const hasNextPage = pageRows.length > limit
  const messages = pageRows.slice(0, limit).map(adminMessageFromRow)
  const last = messages[messages.length - 1]
  const result: ChatAdminTranscriptPage = {
    messages,
    nextCursor: hasNextPage && last ? encodeChatCursor(last.createdAt, last.id) : null,
  }
  const validated = chatAdminTranscriptPageSchema.safeParse(result)
  if (!validated.success) throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
  return validated.data
}

/** Insert an idempotent staff reply; actor authorization is repeated in the RPC. */
export async function insertChatStaffReply(
  input: ChatAdminReplyInput,
  actorUserId: string,
): Promise<ChatAdminMessage> {
  const parsedInput = chatAdminReplySchema.safeParse(input)
  if (!parsedInput.success) throw new ChatAdminRepositoryError('Invalid staff reply.', 400, 'invalid_request')
  validateActor(actorUserId)
  const client = serviceClient()
  const { data, error } = await client.rpc('insert_chat_staff_message', {
    p_conversation_id: parsedInput.data.conversationId,
    p_staff_user_id: actorUserId,
    p_staff_message_id: parsedInput.data.staffMessageId,
    p_body: parsedInput.data.body,
    p_source_interaction_id: parsedInput.data.sourceInteractionId,
    p_discord_actor_id: parsedInput.data.discordActorId,
  })
  if (error) throwRpcFailure(error)
  const message = adminMessageFromRow(resultRow(data))
  return chatAdminMessageSchema.parse(message)
}

/** Set a terminal close/spam state; duplicate same-state actions preserve terminal_at. */
export async function setChatConversationTerminal(
  input: ChatAdminTerminalInput,
  actorUserId: string,
): Promise<ChatAdminConversation> {
  const parsedInput = chatAdminTerminalSchema.safeParse(input)
  if (!parsedInput.success) throw new ChatAdminRepositoryError('Invalid terminal action.', 400, 'invalid_request')
  validateActor(actorUserId)
  const client = serviceClient()
  const { data, error } = await client.rpc('set_chat_conversation_terminal', {
    p_conversation_id: parsedInput.data.conversationId,
    p_staff_user_id: actorUserId,
    p_status: parsedInput.data.status,
    p_discord_actor_id: parsedInput.data.discordActorId,
    p_action_id: parsedInput.data.actionId,
  })
  if (error) throwRpcFailure(error)
  return adminConversationFromRow(resultRow(data))
}

/** Read the private queue singleton for the verified staff dashboard. */
export async function getChatQueueStateForStaff(): Promise<ChatAdminQueueState> {
  const client = serviceClient()
  const { data, error } = await client
    .from('chat_queue_state')
    .select('id,queue_open,queue_expires_at,updated_at')
    .eq('singleton_key', 'default')
    .maybeSingle()
  if (error) throw new ChatAdminRepositoryError('Chat storage is temporarily unavailable.')
  if (!data) throw new ChatAdminRepositoryError('Chat queue is unavailable.')
  return adminQueueFromRow(data as Record<string, unknown>)
}

/** Open/close the queue through the receipt-aware SECURITY DEFINER RPC. */
export async function setChatQueueStateForStaff(
  input: ChatAdminQueueUpdateInput,
  actorUserId: string,
): Promise<ChatAdminQueueState> {
  const parsedInput = chatAdminQueueUpdateSchema.safeParse(input)
  if (!parsedInput.success) throw new ChatAdminRepositoryError('Invalid queue action.', 400, 'invalid_request')
  validateActor(actorUserId)
  const client = serviceClient()
  const { data, error } = await client.rpc('set_chat_queue_state', {
    p_staff_user_id: actorUserId,
    p_queue_open: parsedInput.data.queueOpen,
    p_action_id: parsedInput.data.actionId,
    p_discord_actor_id: parsedInput.data.discordActorId,
  })
  if (error) throwRpcFailure(error)
  return adminQueueFromRow(resultRow(data))
}

// Route-friendly aliases retain one implementation and one strict contract.
export const listAdminChatConversations = listChatConversationsForStaff
export const listAdminChatMessages = listChatMessagesForStaff
export const replyToChatConversation = insertChatStaffReply
export const moderateChatConversation = setChatConversationTerminal
export const getAdminChatQueueState = getChatQueueStateForStaff
export const updateAdminChatQueue = setChatQueueStateForStaff
