import 'server-only'

import { createHash, createPublicKey, randomUUID, verify as verifySignature } from 'node:crypto'

import { after } from 'next/server'

import { getChatServerConfig, type ChatServerConfig } from '@/lib/chat-config'
import {
  insertChatStaffReply,
  setChatConversationTerminal,
  setChatQueueStateForStaff,
} from '@/lib/chat-admin-repository'
import { createDiscordRestClient, DiscordRestError } from '@/lib/chat-discord-client'
import { deliverChatConversation } from '@/lib/chat-discord-delivery'
import { isPlainChatText, MAX_CHAT_MESSAGE } from '@/lib/chat-contracts'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

export const DISCORD_INTERACTION_PATH = '/api/integrations/discord/interactions'
export const DISCORD_INTERACTION_MAX_BODY_BYTES = 64 * 1024
export const DISCORD_INTERACTION_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60
export const DISCORD_INTERACTION_REQUEST_DEADLINE_MS = 2_500
export const DISCORD_INTERACTION_AUTH_DEADLINE_MS = 2_200
export const DISCORD_INTERACTION_EPHEMERAL_FLAG = 1 << 6

const DISCORD_ID = /^\d{1,30}$/u
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const SIGNATURE = /^[0-9a-f]{128}$/iu
const TIMESTAMP = /^\d{1,20}$/u
const TOKEN = /^[A-Za-z0-9._~-]{1,240}$/u
const DISCORD_ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
const INTERACTION_TYPE_PING = 1
const INTERACTION_TYPE_APPLICATION_COMMAND = 2
const INTERACTION_TYPE_MESSAGE_COMPONENT = 3
const INTERACTION_TYPE_MODAL_SUBMIT = 5
const DISCORD_MESSAGE_COMPONENT_BUTTON = 2
const DISCORD_TEXT_INPUT_COMPONENT = 4
const QUEUE_COMMAND_NAME = 'chat-queue'

type JsonRecord = Record<string, unknown>

export type DiscordInteractionFailureCode =
  | 'invalid_request'
  | 'invalid_signature'
  | 'stale_signature'
  | 'configuration_unavailable'
  | 'interaction_unavailable'
  | 'not_authorized'
  | 'conversation_not_found'
  | 'chat_conflict'

export class DiscordInteractionError extends Error {
  readonly code: DiscordInteractionFailureCode

  constructor(code: DiscordInteractionFailureCode, message = 'The Discord interaction is unavailable.') {
    super(message)
    this.name = 'DiscordInteractionError'
    this.code = code
  }
}

export interface DiscordInteractionResponse {
  type: number
  data?: JsonRecord
}

export interface DiscordInteractionDependencies {
  config?: ChatServerConfig
  /** Absolute wall-clock deadline shared by the HTTP route and authorization. */
  deadlineAt?: number
  nowSeconds?: () => number
  fetch?: typeof globalThis.fetch
  uuid?: () => string
  authorization?: {
    lookupStaffUser: (discordActorId: string) => Promise<string | null>
    getConversation: (conversationId: string) => Promise<DiscordConversation | null>
  }
  actions?: {
    reply: typeof insertChatStaffReply
    terminal: typeof setChatConversationTerminal
    queue: typeof setChatQueueStateForStaff
    deliver: typeof deliverChatConversation
  }
}

export interface DiscordConversation {
  id: string
  status: 'open' | 'closed' | 'spam'
  discordThreadId: string | null
  discordStarterMessageId: string | null
}

interface AuthorizedInteraction {
  actorUserId: string
  discordActorId: string
  conversation?: DiscordConversation
}

interface ParsedButtonAction {
  kind: 'reply' | 'close' | 'spam'
  conversationId: string
}

interface ParsedModalAction {
  conversationId: string
  sourceButtonInteractionId: string
  sourceContext: 'thread' | 'starter'
}

interface ParsedQueueAction {
  queueOpen: boolean
}

export interface DiscordInteractionWorkResult {
  response: DiscordInteractionResponse
  work?: () => Promise<void>
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function snowflake(value: unknown): string | null {
  const candidate = text(value)
  return candidate && DISCORD_ID.test(candidate) ? candidate : null
}

function uuid(value: unknown): string | null {
  const candidate = text(value)
  return candidate && UUID.test(candidate) ? candidate : null
}

function interactionToken(value: unknown): string | null {
  const candidate = text(value)
  return candidate && TOKEN.test(candidate) ? candidate : null
}

function configFor(dependencies: DiscordInteractionDependencies): ChatServerConfig {
  return dependencies.config ?? getChatServerConfig()
}

function uuidFor(dependencies: DiscordInteractionDependencies): string {
  const value = dependencies.uuid?.() ?? randomUUID()
  if (!UUID.test(value)) throw new DiscordInteractionError('interaction_unavailable')
  return value
}

const READ_DEADLINE_MARKER = Symbol('read-deadline')

function cancelBoundedReader(reader: ReadableStreamDefaultReader<Uint8Array>): void {
  // Cancellation must not extend the acknowledgement path.  The underlying
  // request stream gets a best-effort abort while the caller returns now.
  void reader.cancel().catch(() => undefined)
}

async function readChunkUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  deadlineAt: number | undefined,
): Promise<ReadableStreamReadResult<Uint8Array> | null> {
  if (deadlineAt === undefined) return reader.read()
  const remainingMs = deadlineAt - Date.now()
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return null
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<typeof READ_DEADLINE_MARKER>((resolve) => {
    timer = setTimeout(() => resolve(READ_DEADLINE_MARKER), remainingMs)
  })
  // Attach a rejection handler even when the timeout wins; otherwise a source
  // which rejects after cancellation could become an unhandled rejection.
  const read = reader.read().catch(() => null)
  try {
    const result = await Promise.race([read, timeout])
    if (result === READ_DEADLINE_MARKER || result === null) return null
    return result
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/** Read a request body without accepting an unbounded body into memory. */
export async function readBoundedRequestBytes(
  request: Request,
  maxBytes: number,
  deadlineAt?: number,
): Promise<Uint8Array | null> {
  if (!Number.isInteger(maxBytes) || maxBytes < 1) return null
  if (deadlineAt !== undefined && (!Number.isFinite(deadlineAt) || deadlineAt <= Date.now())) return null
  const contentLength = request.headers.get('content-length')
  if (contentLength !== null) {
    const parsedLength = Number(contentLength)
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maxBytes) return null
  }

  if (!request.body) {
    try {
      const bytes = new Uint8Array(await request.arrayBuffer())
      if (deadlineAt !== undefined && Date.now() >= deadlineAt) return null
      return bytes.length <= maxBytes ? bytes : null
    } catch {
      return null
    }
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await readChunkUntil(reader, deadlineAt)
      if (!next) {
        cancelBoundedReader(reader)
        return null
      }
      if (next.done) break
      const chunk = next.value
      if (!chunk || typeof chunk.byteLength !== 'number' || !Number.isSafeInteger(chunk.byteLength) || chunk.byteLength < 0) return null
      const normalizedChunk = new Uint8Array(chunk)
      total += normalizedChunk.byteLength
      if (total > maxBytes) {
        cancelBoundedReader(reader)
        return null
      }
      if (deadlineAt !== undefined && Date.now() >= deadlineAt) {
        cancelBoundedReader(reader)
        return null
      }
      chunks.push(normalizedChunk)
    }
  } catch {
    return null
  } finally {
    try { reader.releaseLock() } catch { /* already released */ }
  }

  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

/**
 * Verify Discord's Ed25519 signature against the exact timestamp + raw bytes.
 * JSON parsing must happen only after this function returns true.
 */
export function verifyDiscordInteractionSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  timestampHeader: string | null,
  publicKeyHex: string | null,
  nowSeconds = Math.floor(Date.now() / 1_000),
): 'valid' | 'invalid' | 'stale' {
  if (!signatureHeader || !timestampHeader || !publicKeyHex || !SIGNATURE.test(signatureHeader)
    || !TIMESTAMP.test(timestampHeader) || !/^[0-9a-f]{64}$/iu.test(publicKeyHex)) return 'invalid'
  const timestamp = Number(timestampHeader)
  if (!Number.isSafeInteger(timestamp) || !Number.isSafeInteger(nowSeconds)
    || Math.abs(nowSeconds - timestamp) > DISCORD_INTERACTION_TIMESTAMP_TOLERANCE_SECONDS) return 'stale'
  try {
    const publicKey = createPublicKey({
      key: Buffer.concat([DISCORD_ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
      format: 'der',
      type: 'spki',
    })
    const message = Buffer.concat([Buffer.from(timestampHeader, 'utf8'), Buffer.from(rawBody)])
    const valid = verifySignature(null, message, publicKey, Buffer.from(signatureHeader, 'hex'))
    return valid ? 'valid' : 'invalid'
  } catch {
    return 'invalid'
  }
}

export function parseDiscordInteractionBody(rawBody: Uint8Array): JsonRecord | null {
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(rawBody)
    const value: unknown = JSON.parse(decoded)
    return asRecord(value)
  } catch {
    return null
  }
}

function unavailableResponse(content = 'This action is temporarily unavailable.'): DiscordInteractionResponse {
  return {
    type: 4,
    data: {
      content,
      flags: DISCORD_INTERACTION_EPHEMERAL_FLAG,
      allowed_mentions: { parse: [] },
    },
  }
}

function deferredResponse(): DiscordInteractionResponse {
  return {
    type: 5,
    data: { flags: DISCORD_INTERACTION_EPHEMERAL_FLAG },
  }
}

function modalResponse(
  conversationId: string,
  sourceButtonInteractionId: string,
  sourceContext: ParsedModalAction['sourceContext'],
): DiscordInteractionResponse {
  const customId = `pot:v1:reply-modal:${conversationId}:${sourceButtonInteractionId}:${sourceContext}`
  if (customId.length > 100) return unavailableResponse()
  return {
    type: 9,
    data: {
      custom_id: customId,
      title: 'Reply to visitor',
      components: [{
        type: 1,
        components: [{
          type: DISCORD_TEXT_INPUT_COMPONENT,
          custom_id: 'body',
          style: 2,
          label: 'Reply',
          min_length: 1,
          max_length: MAX_CHAT_MESSAGE,
          required: true,
        }],
      }],
    },
  }
}

export function pingInteractionResponse(): DiscordInteractionResponse {
  return { type: INTERACTION_TYPE_PING }
}

function successContent(action: string): string {
  if (action === 'reply') return 'Reply sent.'
  if (action === 'close') return 'Conversation closed.'
  if (action === 'spam') return 'Conversation marked as spam.'
  if (action === 'queue_open') return 'Chat queue opened.'
  return 'Chat queue closed.'
}

function parseButtonAction(payload: JsonRecord): ParsedButtonAction | null {
  const data = asRecord(payload.data)
  if (!data || payload.type !== INTERACTION_TYPE_MESSAGE_COMPONENT || data.component_type !== DISCORD_MESSAGE_COMPONENT_BUTTON) return null
  const customId = text(data.custom_id)
  if (!customId) return null
  const match = /^pot:v1:(reply|close|spam):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu.exec(customId)
  if (!match || !match[1] || !match[2]) return null
  return { kind: match[1].toLowerCase() as ParsedButtonAction['kind'], conversationId: match[2] }
}

function parseModalAction(payload: JsonRecord): ParsedModalAction | null {
  const data = asRecord(payload.data)
  if (!data || payload.type !== INTERACTION_TYPE_MODAL_SUBMIT) return null
  const customId = text(data.custom_id)
  if (!customId) return null
  const match = /^pot:v1:reply-modal:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):([0-9]{1,30}):(thread|starter)$/iu.exec(customId)
  if (!match || !match[1] || !match[2] || !match[3]) return null
  return {
    conversationId: match[1],
    sourceButtonInteractionId: match[2],
    sourceContext: match[3].toLowerCase() as ParsedModalAction['sourceContext'],
  }
}

function parseQueueAction(payload: JsonRecord, config: ChatServerConfig): ParsedQueueAction | null {
  if (payload.type !== INTERACTION_TYPE_APPLICATION_COMMAND) return null
  const data = asRecord(payload.data)
  if (!data) return null
  if ((text(data.name)?.toLowerCase() ?? '') !== QUEUE_COMMAND_NAME) return null
  const options = Array.isArray(data.options) ? data.options : []
  if (options.length !== 1) return null
  const option = asRecord(options[0])
  if (!option || option.type !== 1) return null
  const optionName = text(option.name)?.toLowerCase() ?? ''
  if (optionName !== 'open' && optionName !== 'close') return null
  // Discord sends subcommands as type 1 with no nested options for this
  // registration.  Reject extra keys/values so an unregistered boolean or
  // alternate command shape cannot silently choose the queue state.
  if (Object.keys(option).some((key) => key !== 'type' && key !== 'name')) return null
  const queueOpen = optionName === 'open'
  if (text(payload.channel_id) !== config.discordChannelId) return null
  return { queueOpen }
}

function modalBody(payload: JsonRecord): string | null {
  const data = asRecord(payload.data)
  if (!data || !Array.isArray(data.components) || data.components.length < 1 || data.components.length > 5) return null
  let value: string | null = null
  for (const rowValue of data.components) {
    const row = asRecord(rowValue)
    if (!row || row.type !== 1 || !Array.isArray(row.components) || row.components.length !== 1) return null
    const component = asRecord(row.components[0])
    if (!component || component.type !== DISCORD_TEXT_INPUT_COMPONENT || component.custom_id !== 'body' || value !== null) return null
    value = text(component.value)
  }
  if (value === null) return null
  const trimmed = value.trim()
  if (trimmed.length < 1 || trimmed.length > MAX_CHAT_MESSAGE || !isPlainChatText(trimmed)) return null
  return trimmed
}

function actorIdFromPayload(payload: JsonRecord): string | null {
  const member = asRecord(payload.member)
  const memberUser = member ? asRecord(member.user) : null
  const actor = snowflake(memberUser?.id ?? asRecord(payload.user)?.id)
  return actor
}

function hasAllowedRole(payload: JsonRecord, config: ChatServerConfig): boolean {
  const member = asRecord(payload.member)
  const roles = member && Array.isArray(member.roles) ? member.roles : []
  if (roles.length > 32) return false
  return roles.every((role) => typeof role === 'string' && DISCORD_ID.test(role))
    && roles.some((role) => config.discordStaffRoleIds.includes(role as string))
}

function interactionApplicationMatches(payload: JsonRecord, config: ChatServerConfig): boolean {
  return snowflake(payload.application_id) === config.discordApplicationId
    && snowflake(payload.guild_id) === config.discordGuildId
}

function interactionMessageRelation(
  payload: JsonRecord,
  conversation: DiscordConversation,
  config: ChatServerConfig,
  modalAction: ParsedModalAction | null = null,
): boolean {
  const channelId = snowflake(payload.channel_id)
  if (!channelId) return false
  const message = asRecord(payload.message)
  const messageId = snowflake(message?.id)
  if (payload.type === INTERACTION_TYPE_MESSAGE_COMPONENT) {
    const author = asRecord(message?.author)
    if (!message || author?.bot !== true || snowflake(author.id) !== config.discordApplicationId) return false
    const messageChannelId = message.channel_id == null ? channelId : snowflake(message.channel_id)
    if (messageChannelId !== channelId) return false
  }
  const threadContext = conversation.discordThreadId !== null && channelId === conversation.discordThreadId
  const starterContext = conversation.discordStarterMessageId !== null
    && messageId === conversation.discordStarterMessageId
    && channelId === config.discordChannelId
  // Modal submissions do not always include the original message object.  The
  // generated modal custom id records whether its signed button originated on
  // the stored starter in the parent or inside the stored thread.
  if (payload.type === INTERACTION_TYPE_MODAL_SUBMIT) {
    return modalAction?.sourceContext === 'starter' ? channelId === config.discordChannelId : threadContext
  }
  return threadContext || starterContext
}

function defaultAuthorization() {
  return {
    async lookupStaffUser(discordActorId: string): Promise<string | null> {
      const client = createSupabaseServiceRoleClient()
      const { data, error } = await client.rpc('lookup_chat_discord_staff_actor', {
        p_discord_actor_id: discordActorId,
      })
      if (error) throw new DiscordInteractionError('configuration_unavailable')
      if (typeof data === 'string' && UUID.test(data)) return data
      const row = asRecord(Array.isArray(data) ? data[0] : data)
      return uuid(row?.user_id) ?? uuid(row?.lookup_chat_discord_staff_actor)
    },
    async getConversation(conversationId: string): Promise<DiscordConversation | null> {
      const client = createSupabaseServiceRoleClient()
      const { data, error } = await client
        .from('chat_conversations')
        .select('id,status,discord_thread_id,discord_starter_message_id')
        .eq('id', conversationId)
        .maybeSingle()
      if (error) throw new DiscordInteractionError('configuration_unavailable')
      const row = asRecord(data)
      if (!row) return null
      const parsedId = uuid(row.id)
      const threadId = row.discord_thread_id == null ? null : snowflake(row.discord_thread_id)
      const starterId = row.discord_starter_message_id == null ? null : snowflake(row.discord_starter_message_id)
      const status = row.status === 'open' || row.status === 'closed' || row.status === 'spam' ? row.status : null
      if (!parsedId || !status || (row.discord_thread_id != null && threadId === null) || (row.discord_starter_message_id != null && starterId === null)) {
        throw new DiscordInteractionError('configuration_unavailable')
      }
      return { id: parsedId, status, discordThreadId: threadId, discordStarterMessageId: starterId }
    },
  }
}

function actionsFor(dependencies: DiscordInteractionDependencies) {
  return {
    reply: dependencies.actions?.reply ?? insertChatStaffReply,
    terminal: dependencies.actions?.terminal ?? setChatConversationTerminal,
    queue: dependencies.actions?.queue ?? setChatQueueStateForStaff,
    deliver: dependencies.actions?.deliver ?? deliverChatConversation,
  }
}

function authorizationFor(dependencies: DiscordInteractionDependencies) {
  return dependencies.authorization ?? defaultAuthorization()
}

async function verifyDiscordThreadRelation(
  conversation: DiscordConversation,
  config: ChatServerConfig,
  dependencies: DiscordInteractionDependencies,
): Promise<void> {
  if (!conversation.discordThreadId) throw new DiscordInteractionError('conversation_not_found')
  try {
    const client = createDiscordRestClient({ config, fetch: dependencies.fetch, timeoutMs: 750 })
    const channel = await client.getThread(conversation.discordThreadId)
    if (channel.guildId !== config.discordGuildId || channel.parentId !== config.discordChannelId) {
      throw new DiscordInteractionError('interaction_unavailable')
    }
  } catch (error) {
    if (error instanceof DiscordInteractionError) throw error
    if (error instanceof DiscordRestError) throw new DiscordInteractionError('interaction_unavailable')
    throw new DiscordInteractionError('configuration_unavailable')
  }
}

async function authorize(
  payload: JsonRecord,
  config: ChatServerConfig,
  dependencies: DiscordInteractionDependencies,
  conversation: DiscordConversation | undefined,
  modalAction: ParsedModalAction | null = null,
): Promise<AuthorizedInteraction> {
  if (!config.credentialReady || !config.discordApplicationId || !config.discordGuildId || !config.discordChannelId
    || config.discordStaffRoleIds.length === 0) throw new DiscordInteractionError('configuration_unavailable')
  if (!interactionApplicationMatches(payload, config) || !hasAllowedRole(payload, config)) {
    throw new DiscordInteractionError('not_authorized')
  }
  const discordActorId = actorIdFromPayload(payload)
  if (!discordActorId) throw new DiscordInteractionError('not_authorized')
  if (conversation && !interactionMessageRelation(payload, conversation, config, modalAction)) {
    throw new DiscordInteractionError('conversation_not_found')
  }
  if (conversation) await verifyDiscordThreadRelation(conversation, config, dependencies)
  const actorUserId = await authorizationFor(dependencies).lookupStaffUser(discordActorId)
  if (!actorUserId) throw new DiscordInteractionError('not_authorized')
  return { actorUserId, discordActorId, conversation }
}

async function withDeadline<T>(promise: Promise<T>, deadlineMs: number): Promise<{ timedOut: boolean; value?: T; error?: unknown }> {
  if (!Number.isFinite(deadlineMs) || deadlineMs <= 0) return { timedOut: true }
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timeoutHandle = setTimeout(() => resolve({ timedOut: true }), deadlineMs)
  })
  try {
    const result = await Promise.race([
      promise.then((value) => ({ timedOut: false as const, value })).catch((error: unknown) => ({ timedOut: false as const, error })),
      timeout,
    ])
    return result
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
  }
}

async function scheduleWork(work: () => Promise<void>): Promise<void> {
  try {
    after(async () => {
      try { await work() } catch { /* callback failures are edited to a safe message by the worker */ }
    })
  } catch {
    // Unit callers do not have a Next request store. Awaiting here keeps the
    // fallback deterministic and avoids an untracked fire-and-forget promise.
    await work()
  }
}

async function editOriginalInteractionResponse(
  applicationId: string,
  token: string,
  body: JsonRecord,
  dependencies: DiscordInteractionDependencies,
): Promise<void> {
  if (!DISCORD_ID.test(applicationId) || !TOKEN.test(token)) return
  const fetcher = dependencies.fetch ?? globalThis.fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 1_500)
  try {
    await fetcher(
      `https://discord.com/api/v10/webhooks/${encodeURIComponent(applicationId)}/${encodeURIComponent(token)}/messages/@original`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    )
  } catch {
    // The interaction token is intentionally not included in any error path.
  } finally {
    clearTimeout(timer)
  }
}

function completionBody(content: string): JsonRecord {
  return { content, flags: DISCORD_INTERACTION_EPHEMERAL_FLAG, allowed_mentions: { parse: [] } }
}

function replyCompletionContent(deliveryStatus: unknown): string {
  return deliveryStatus === 'sent'
    ? 'Reply saved on the website and relayed to Discord.'
    : 'Reply saved on the website. Discord relay is pending or needs retry.'
}

function interactionActionId(payload: JsonRecord): string {
  return snowflake(payload.id) ?? ''
}

function deadlineRemaining(dependencies: DiscordInteractionDependencies): number | null {
  if (dependencies.deadlineAt === undefined) return null
  if (!Number.isFinite(dependencies.deadlineAt)) return 0
  return dependencies.deadlineAt - Date.now()
}

function authorizationFailureResponse(error: unknown, timedOut: boolean): DiscordInteractionResponse {
  return timedOut ? unavailableResponse() : safeInteractionErrorResponse(error)
}

async function runTerminalAction(
  action: ParsedButtonAction,
  payload: JsonRecord,
  authorized: AuthorizedInteraction,
  config: ChatServerConfig,
  dependencies: DiscordInteractionDependencies,
): Promise<void> {
  const actions = actionsFor(dependencies)
  try {
    const status = action.kind === 'close' ? 'closed' : 'spam' as const
    await actions.terminal({ conversationId: action.conversationId, status, actionId: interactionActionId(payload) }, authorized.actorUserId, {
      discordActorId: authorized.discordActorId,
    })
    const token = interactionToken(payload.token)
    if (token && config.discordApplicationId) await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody(successContent(action.kind)), dependencies)
  } catch {
    const token = interactionToken(payload.token)
    if (token && config.discordApplicationId) await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody('This action is temporarily unavailable.'), dependencies)
  }
}

async function runQueueAction(
  action: ParsedQueueAction,
  payload: JsonRecord,
  authorized: AuthorizedInteraction,
  config: ChatServerConfig,
  dependencies: DiscordInteractionDependencies,
): Promise<void> {
  const token = interactionToken(payload.token)
  try {
    await actionsFor(dependencies).queue({ queueOpen: action.queueOpen, actionId: interactionActionId(payload) }, authorized.actorUserId, {
      discordActorId: authorized.discordActorId,
    })
    if (token && config.discordApplicationId) await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody(successContent(action.queueOpen ? 'queue_open' : 'queue_close')), dependencies)
  } catch {
    if (token && config.discordApplicationId) await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody('This queue action is temporarily unavailable.'), dependencies)
  }
}

async function runReplyAction(
  action: ParsedModalAction,
  body: string,
  payload: JsonRecord,
  authorized: AuthorizedInteraction,
  config: ChatServerConfig,
  dependencies: DiscordInteractionDependencies,
): Promise<void> {
  const token = interactionToken(payload.token)
  let message: Awaited<ReturnType<typeof insertChatStaffReply>>
  try {
    message = await actionsFor(dependencies).reply({
      conversationId: action.conversationId,
      staffMessageId: uuidFor(dependencies),
      body,
    }, authorized.actorUserId, {
      sourceInteractionId: interactionActionId(payload),
      discordActorId: authorized.discordActorId,
    })
  } catch {
    if (token && config.discordApplicationId) await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody('The reply could not be saved.'), dependencies)
    return
  }

  try {
    const delivery = await actionsFor(dependencies).deliver(message.conversationId)
    if (token && config.discordApplicationId) {
      const status = delivery && typeof delivery === 'object' && 'status' in delivery
        ? (delivery as { status?: unknown }).status
        : undefined
      await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody(replyCompletionContent(status)), dependencies)
    }
  } catch {
    // The website reply was already committed.  Delivery remains durable and
    // retryable, so never report this Discord-side failure as a lost reply.
    if (token && config.discordApplicationId) await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody(replyCompletionContent('pending')), dependencies)
  }
}

function bodyDigest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Validate and prepare one already signature-verified Discord interaction.
 * The returned work is scheduled by the route through Next's request
 * lifecycle, so long DB/Discord work never blocks the initial acknowledgement.
 */
export async function handleVerifiedDiscordInteraction(
  payload: JsonRecord,
  dependencies: DiscordInteractionDependencies = {},
): Promise<DiscordInteractionWorkResult> {
  const config = configFor(dependencies)
  const initialRemaining = deadlineRemaining(dependencies)
  if (initialRemaining !== null && initialRemaining <= 0) return { response: unavailableResponse() }
  if (payload.type === INTERACTION_TYPE_PING) {
    // Discord's endpoint verification PING is not a staff action, but the
    // signed application id still has to bind it to this installation.
    return snowflake(payload.application_id) === config.discordApplicationId
      ? { response: pingInteractionResponse() }
      : { response: unavailableResponse() }
  }
  const interaction = snowflake(payload.id)
  if (!interaction || !interactionToken(payload.token)) return { response: unavailableResponse() }
  if (!config.credentialReady) return { response: unavailableResponse() }
  if (!interactionApplicationMatches(payload, config)) return { response: unavailableResponse() }

  const button = parseButtonAction(payload)
  const modal = parseModalAction(payload)
  const queue = parseQueueAction(payload, config)
  if (!button && !modal && !queue) return { response: unavailableResponse() }
  if (queue && queue.queueOpen && !config.ready) return { response: unavailableResponse('Chat is not currently configured for new conversations.') }
  if ((button || modal) && !hasAllowedRole(payload, config)) return { response: unavailableResponse('This action is not authorized.') }
  if (queue && text(payload.guild_id) !== config.discordGuildId) return { response: unavailableResponse() }
  const body = modal ? modalBody(payload) : null
  if (modal && !body) return { response: unavailableResponse('Use a plain-text reply of 4,000 characters or fewer.') }

  const authorization = authorizationFor(dependencies)
  const conversationId = button?.conversationId ?? modal?.conversationId
  const authPromise = (async () => {
    const conversation = conversationId
      ? await authorization.getConversation(conversationId)
      : undefined
    if (conversationId && !conversation) throw new DiscordInteractionError('conversation_not_found')
    const authorized = await authorize(payload, config, dependencies, conversation ?? undefined, modal)
    return { conversation: conversation ?? undefined, authorized }
  })()
  const remaining = deadlineRemaining(dependencies)
  const authorizationDeadline = remaining === null
    ? DISCORD_INTERACTION_AUTH_DEADLINE_MS
    : Math.min(DISCORD_INTERACTION_AUTH_DEADLINE_MS, remaining)
  const authorizedResult = await withDeadline(authPromise, authorizationDeadline)
  const deadlineExpired = deadlineRemaining(dependencies) !== null && (deadlineRemaining(dependencies) ?? 0) <= 0
  const authorizationTimedOut = authorizedResult.timedOut || deadlineExpired
  const authorized = !authorizationTimedOut && !authorizedResult.error ? authorizedResult.value?.authorized : undefined
  const conversation = !authorizationTimedOut && !authorizedResult.error ? authorizedResult.value?.conversation : undefined

  if (button?.kind === 'reply') {
    if (!authorized) return { response: authorizationFailureResponse(authorizedResult.error, authorizationTimedOut) }
    const sourceContext = text(payload.channel_id) === config.discordChannelId ? 'starter' : 'thread'
    return { response: modalResponse(button.conversationId, interaction, sourceContext) }
  }

  if (modal) {
    const work = async () => {
      try {
        const finalConversation = conversationId
          ? conversation ?? await authorization.getConversation(conversationId)
          : undefined
        if (conversationId && !finalConversation) throw new DiscordInteractionError('conversation_not_found')
        const finalAuthorized = authorized ?? await authorize(payload, config, dependencies, finalConversation ?? undefined, modal)
        await runReplyAction(modal, body!, payload, finalAuthorized, config, dependencies)
      } catch {
        const token = interactionToken(payload.token)
        if (token && config.discordApplicationId) await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody('The reply could not be saved.'), dependencies)
      }
    }
    // A known authorization failure is answered immediately.  Only a slow
    // dependency receives a deferred response and a lifecycle-tracked retry.
    if (!authorized && !authorizationTimedOut) return { response: authorizationFailureResponse(authorizedResult.error, false) }
    return { response: deferredResponse(), work: () => scheduleWork(work) }
  }

  if (queue) {
    const work = async () => {
      try {
        const finalAuthorized = authorized ?? await authorize(payload, config, dependencies, undefined)
        await runQueueAction(queue, payload, finalAuthorized, config, dependencies)
      } catch {
        const token = interactionToken(payload.token)
        if (token && config.discordApplicationId) await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody('This queue action is temporarily unavailable.'), dependencies)
      }
    }
    if (!authorized && !authorizationTimedOut) return { response: authorizationFailureResponse(authorizedResult.error, false) }
    return { response: deferredResponse(), work: () => scheduleWork(work) }
  }

  if (button && (button.kind === 'close' || button.kind === 'spam')) {
    const work = async () => {
      try {
        const finalConversation = conversationId
          ? conversation ?? await authorization.getConversation(conversationId)
          : undefined
        if (conversationId && !finalConversation) throw new DiscordInteractionError('conversation_not_found')
        const finalAuthorized = authorized ?? await authorize(payload, config, dependencies, finalConversation ?? undefined)
        await runTerminalAction(button, payload, finalAuthorized, config, dependencies)
      } catch {
        const token = interactionToken(payload.token)
        if (token && config.discordApplicationId) await editOriginalInteractionResponse(config.discordApplicationId, token, completionBody('This action is temporarily unavailable.'), dependencies)
      }
    }
    if (!authorized && !authorizationTimedOut) return { response: authorizationFailureResponse(authorizedResult.error, false) }
    return { response: deferredResponse(), work: () => scheduleWork(work) }
  }

  // Defensive fallback for future interaction types.  It remains a valid
  // ephemeral acknowledgement and does not mutate storage.
  return { response: unavailableResponse() }
}

/** Schedule a deferred interaction operation and await only the scheduler. */
export async function scheduleDiscordInteractionWork(work: (() => Promise<void>) | undefined): Promise<void> {
  if (work) await work()
}

export function safeInteractionErrorResponse(error: unknown): DiscordInteractionResponse {
  if (error instanceof DiscordInteractionError && error.code === 'not_authorized') return unavailableResponse('This action is not authorized.')
  return unavailableResponse()
}

export function digestInteractionBody(body: string): string {
  return bodyDigest(body)
}
