import 'server-only'

import { getChatServerConfig, type ChatServerConfig } from '@/lib/chat-config'

/** Discord API v10 is intentionally fixed; callers cannot supply a URL. */
export const DISCORD_API_V10 = 'https://discord.com/api/v10'
export const DISCORD_SUPPRESS_EMBEDS = 1 << 2
export const DISCORD_MAX_CONTENT_LENGTH = 2_000
export const DISCORD_MAX_HISTORY_PAGES = 3
export const DISCORD_HISTORY_PAGE_SIZE = 100

const snowflakePattern = /^\d{1,30}$/u

export type DiscordRestFailureCode =
  | 'discord_config'
  | 'discord_timeout'
  | 'discord_network'
  | 'discord_malformed'
  | 'discord_not_found'
  | 'discord_http_4xx'
  | 'discord_http_5xx'
  | 'discord_429'
  | 'discord_relation'
  | 'discord_thread_locked'

export class DiscordRestError extends Error {
  readonly code: DiscordRestFailureCode
  readonly httpStatus: number | null
  readonly retryAfterSeconds: number | null

  constructor(
    code: DiscordRestFailureCode,
    message: string,
    options: { httpStatus?: number | null; retryAfterSeconds?: number | null } = {},
  ) {
    super(message)
    this.name = 'DiscordRestError'
    this.code = code
    this.httpStatus = options.httpStatus ?? null
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
  }
}

export interface DiscordMessage {
  id: string
  content: string
  nonce: string | null
  authorBot: boolean
  /** Discord's author id is retained only for exact bot-identity reconciliation. */
  authorId?: string | null
}

export interface DiscordThreadChannel {
  id: string
  guildId: string | null
  parentId: string | null
  archived: boolean
  locked: boolean
}

export interface DiscordMessagePayload {
  content: string
  nonce: string
  enforceNonce: true
  allowedMentions: { parse: [] }
  flags: number
  components?: DiscordComponentRow[]
}

export interface DiscordButton {
  type: 2
  style: 1 | 2 | 4
  label: string
  custom_id: string
}

export interface DiscordComponentRow {
  type: 1
  components: DiscordButton[]
}

export interface DiscordRestClientOptions {
  config?: ChatServerConfig
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}

interface RawDiscordMessage {
  id?: unknown
  content?: unknown
  nonce?: unknown
  author?: { id?: unknown; bot?: unknown } | null
}

interface RawDiscordChannel {
  id?: unknown
  guild_id?: unknown
  parent_id?: unknown
  type?: unknown
  archived?: unknown
  thread_metadata?: { archived?: unknown; locked?: unknown } | null
}

function validSnowflake(value: string): boolean {
  return snowflakePattern.test(value)
}

function requireSnowflake(value: string, what: string): void {
  if (!validSnowflake(value)) throw new DiscordRestError('discord_relation', `Invalid Discord ${what}.`)
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asSnowflake(value: unknown): string | null {
  return typeof value === 'string' && validSnowflake(value) ? value : null
}

function retryAfter(value: unknown): number | null {
  const seconds = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(seconds) || seconds < 0) return null
  return Math.min(seconds, 24 * 60 * 60)
}

function headerRetryAfter(response: Response): number | null {
  return retryAfter(response.headers.get('retry-after'))
}

function messageFromRaw(value: unknown): DiscordMessage {
  const source = asObject(value) as RawDiscordMessage
  const id = asSnowflake(source.id)
  if (!id) throw new DiscordRestError('discord_malformed', 'Discord returned an invalid message.')
  const nonce = source.nonce == null
    ? null
    : typeof source.nonce === 'string' || typeof source.nonce === 'number'
      ? String(source.nonce)
      : null
  return {
    id,
    content: typeof source.content === 'string' ? source.content : '',
    nonce,
    authorBot: source.author?.bot === true,
    authorId: asSnowflake(source.author?.id),
  }
}

function channelFromRaw(value: unknown, expectedId: string, config: ChatServerConfig): DiscordThreadChannel {
  const source = asObject(value) as RawDiscordChannel
  const id = asSnowflake(source.id)
  if (!id) throw new DiscordRestError('discord_malformed', 'Discord returned an invalid thread.')
  if (id !== expectedId) throw new DiscordRestError('discord_relation', 'Discord thread identity did not match.')
  const guildId = asSnowflake(source.guild_id)
  const parentId = asSnowflake(source.parent_id)
  if (!guildId || !parentId) {
    throw new DiscordRestError('discord_relation', 'Discord thread relation was incomplete.')
  }
  if (guildId !== config.discordGuildId) {
    throw new DiscordRestError('discord_relation', 'Discord thread guild did not match the configured guild.')
  }
  if (parentId !== config.discordChannelId) {
    throw new DiscordRestError('discord_relation', 'Discord thread parent did not match the configured channel.')
  }
  if (typeof source.type !== 'number' || !Number.isInteger(source.type)
    || ![10, 11, 12].includes(source.type)) {
    throw new DiscordRestError('discord_relation', 'Discord channel was not a supported thread.')
  }
  return {
    id,
    guildId,
    parentId,
    archived: source.thread_metadata?.archived === true || source.archived === true,
    locked: source.thread_metadata?.locked === true,
  }
}

function path(...segments: string[]): string {
  // Route templates are private and every caller validates its dynamic
  // snowflakes before reaching this helper. Literal components such as
  // "channels" and "messages" are deliberately not parsed as snowflakes.
  return segments.map((segment) => encodeURIComponent(segment)).join('/')
}

function jsonHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  }
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error instanceof DOMException && error.name === 'AbortError'
      || error && typeof error === 'object' && 'name' in error && String((error as { name?: unknown }).name) === 'AbortError',
  )
}

/**
 * Small REST client with no retries.  Retry/backoff decisions belong to the
 * durable orchestrator, where a claim can be fenced before and after each
 * network call.
 */
export class DiscordRestClient {
  private readonly config: ChatServerConfig
  private readonly fetcher: typeof globalThis.fetch
  private readonly timeoutMs: number
  private readonly knownThreadIds = new Set<string>()
  /** Configured Discord application id is the dedicated bot author id. */
  readonly botAuthorId: string

  constructor(options: DiscordRestClientOptions = {}) {
    this.config = options.config ?? getChatServerConfig()
    if (!this.config.discordDeliveryReady
      || !this.config.discordBotToken
      || !this.config.discordGuildId
      || !this.config.discordChannelId) {
      throw new DiscordRestError('discord_config', 'Discord delivery is not configured.')
    }
    const botAuthorId = this.config.discordApplicationId
    if (typeof botAuthorId !== 'string' || !validSnowflake(botAuthorId)) {
      throw new DiscordRestError('discord_config', 'Discord bot identity is not configured.')
    }
    this.botAuthorId = botAuthorId
    this.fetcher = options.fetch ?? globalThis.fetch
    const timeoutMs = options.timeoutMs
    const validTimeout = typeof timeoutMs === 'number'
      && Number.isInteger(timeoutMs)
      && timeoutMs > 0
      && timeoutMs <= 30_000
    this.timeoutMs = validTimeout
      ? timeoutMs as number
      : 8_000
  }

  private url(...segments: string[]): string {
    return `${DISCORD_API_V10}/${path(...segments)}`
  }

  private requireParent(channelId: string): void {
    requireSnowflake(channelId, 'channel id')
    if (channelId !== this.config.discordChannelId) {
      throw new DiscordRestError('discord_relation', 'Discord destination is not the configured parent channel.')
    }
  }

  private requireKnownThread(threadId: string): void {
    requireSnowflake(threadId, 'thread id')
    if (!this.knownThreadIds.has(threadId)) {
      throw new DiscordRestError('discord_relation', 'Discord thread relation was not established.')
    }
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    body?: unknown,
  ): Promise<T | null> {
    const controller = new AbortController()
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    let request: Promise<Response>
    try {
      request = this.fetcher(url, {
        method,
        headers: jsonHeaders(this.config.discordBotToken!),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      })
    } catch {
      throw new DiscordRestError('discord_network', 'Discord request failed.')
    }
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        controller.abort()
        reject(new DiscordRestError('discord_timeout', 'Discord request timed out.'))
      }, this.timeoutMs)
    })
    try {
      const response = await Promise.race([request, timeout]).catch((error: unknown) => {
        if (error instanceof DiscordRestError) throw error
        if (isAbortError(error)) throw new DiscordRestError('discord_timeout', 'Discord request timed out.')
        throw new DiscordRestError('discord_network', 'Discord request failed.')
      })

      if (response.status === 429) {
        let retrySeconds = headerRetryAfter(response)
        try {
          const payload = await Promise.race([response.json(), timeout]) as { retry_after?: unknown }
          retrySeconds = retryAfter(payload?.retry_after) ?? retrySeconds
        } catch (error) {
          // A valid Retry-After header is authoritative even when Discord's
          // JSON body hangs. Preserve it as a durable rate-limit cooldown
          // instead of converting the response into an ambiguous timeout.
          if (error instanceof DiscordRestError && error.code === 'discord_timeout' && retrySeconds !== null) {
            // Keep the header-derived value.
          } else if (error instanceof DiscordRestError) {
            throw error
          }
          // Header-only rate limits are valid; body details are never surfaced.
        }
        throw new DiscordRestError('discord_429', 'Discord rate limit.', {
          httpStatus: response.status,
          retryAfterSeconds: retrySeconds,
        })
      }
      if (response.status === 404) {
        throw new DiscordRestError('discord_not_found', 'Discord resource was not found.', { httpStatus: response.status })
      }
      if (response.status >= 500) {
        throw new DiscordRestError('discord_http_5xx', 'Discord service failed.', { httpStatus: response.status })
      }
      if (response.status >= 400) {
        throw new DiscordRestError('discord_http_4xx', 'Discord rejected the request.', { httpStatus: response.status })
      }
      if (response.status === 204) return null
      try {
        return await Promise.race([response.json(), timeout]) as T
      } catch (error) {
        if (error instanceof DiscordRestError) throw error
        throw new DiscordRestError('discord_malformed', 'Discord returned an invalid response.', { httpStatus: response.status })
      }
    } finally {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
    }
  }

  async sendStarterMessage(payload: DiscordMessagePayload): Promise<DiscordMessage> {
    this.requireParent(this.config.discordChannelId!)
    const raw = await this.request<RawDiscordMessage>('POST', this.url('channels', this.config.discordChannelId!, 'messages'), {
      content: payload.content,
      nonce: payload.nonce,
      enforce_nonce: true,
      allowed_mentions: payload.allowedMentions,
      flags: payload.flags,
      ...(payload.components ? { components: payload.components } : {}),
    })
    return messageFromRaw(raw)
  }

  async sendThreadMessage(threadId: string, payload: DiscordMessagePayload): Promise<DiscordMessage> {
    this.requireKnownThread(threadId)
    const raw = await this.request<RawDiscordMessage>('POST', this.url('channels', threadId, 'messages'), {
      content: payload.content,
      nonce: payload.nonce,
      enforce_nonce: true,
      allowed_mentions: payload.allowedMentions,
      flags: payload.flags,
      ...(payload.components ? { components: payload.components } : {}),
    })
    return messageFromRaw(raw)
  }

  async getThread(threadId: string): Promise<DiscordThreadChannel> {
    requireSnowflake(threadId, 'thread id')
    const raw = await this.request<RawDiscordChannel>('GET', this.url('channels', threadId))
    const channel = channelFromRaw(raw, threadId, this.config)
    this.knownThreadIds.add(threadId)
    return channel
  }

  async startThreadFromMessage(starterMessageId: string, name: string): Promise<DiscordThreadChannel> {
    requireSnowflake(starterMessageId, 'starter message id')
    const raw = await this.request<RawDiscordChannel>(
      'POST',
      this.url('channels', this.config.discordChannelId!, 'messages', starterMessageId, 'threads'),
      { name, auto_archive_duration: 1440 },
    )
    const channel = channelFromRaw(raw, starterMessageId, this.config)
    if (channel.id !== starterMessageId) {
      throw new DiscordRestError('discord_relation', 'Start Thread from Message returned a different thread.')
    }
    this.knownThreadIds.add(starterMessageId)
    return channel
  }

  async unarchiveThread(threadId: string): Promise<DiscordThreadChannel> {
    this.requireKnownThread(threadId)
    const raw = await this.request<RawDiscordChannel>('PATCH', this.url('channels', threadId), { archived: false })
    const channel = channelFromRaw(raw, threadId, this.config)
    this.knownThreadIds.add(threadId)
    return channel
  }

  async listParentMessages(before: string | null = null): Promise<DiscordMessage[]> {
    this.requireParent(this.config.discordChannelId!)
    return this.listMessages(this.config.discordChannelId!, before)
  }

  async listThreadMessages(threadId: string, before: string | null = null): Promise<DiscordMessage[]> {
    this.requireKnownThread(threadId)
    return this.listMessages(threadId, before)
  }

  private async listMessages(channelId: string, before: string | null): Promise<DiscordMessage[]> {
    requireSnowflake(channelId, 'channel id')
    const query = new URLSearchParams({ limit: String(DISCORD_HISTORY_PAGE_SIZE) })
    if (before !== null) {
      requireSnowflake(before, 'message id')
      query.set('before', before)
    }
    const raw = await this.request<unknown[]>('GET', `${this.url('channels', channelId, 'messages')}?${query.toString()}`)
    if (!Array.isArray(raw)) throw new DiscordRestError('discord_malformed', 'Discord returned invalid message history.')
    return raw.map(messageFromRaw)
  }

  async deleteStarterMessage(starterMessageId: string): Promise<void> {
    this.requireParent(this.config.discordChannelId!)
    requireSnowflake(starterMessageId, 'starter message id')
    await this.request('DELETE', this.url('channels', this.config.discordChannelId!, 'messages', starterMessageId))
  }

  /** Cleanup deletion is destination-bound and only accepts the starter id as thread id. */
  async deleteConfiguredThread(threadId: string, parentChannelId: string, starterMessageId: string | null): Promise<void> {
    this.requireParent(parentChannelId)
    requireSnowflake(threadId, 'thread id')
    if (starterMessageId === null || threadId !== starterMessageId) {
      throw new DiscordRestError('discord_relation', 'Discord cleanup thread did not match the stored starter.')
    }
    await this.request('DELETE', this.url('channels', threadId))
  }
}

export function createDiscordRestClient(options: DiscordRestClientOptions = {}): DiscordRestClient {
  return new DiscordRestClient(options)
}
