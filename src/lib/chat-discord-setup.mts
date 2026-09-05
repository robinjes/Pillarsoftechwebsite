import {
  DISCORD_GUILD_TEXT_TYPE,
  DISCORD_MAX_MAPPINGS,
  DISCORD_MAX_RESPONSE_BYTES,
  DISCORD_MAX_SPECIFIC_MEMBERS,
  DISCORD_SETUP_API_V10,
  evaluateDiscordChannelPermissions,
  hasDiscordPermission,
  isDiscordPublicKey,
  isDiscordSnowflake,
  isUuid,
  parseDiscordPermissionBits,
  type DiscordMemberRecord,
  type DiscordPermissionOverwrite,
  type DiscordRoleRecord,
  type SetupFinding,
  type SetupFindingStatus,
} from './chat-discord-permissions.mts'

function finding(name: string, status: SetupFindingStatus, detail: string): SetupFinding {
  return { name, status, detail }
}

function statusRank(status: SetupFindingStatus): number {
  if (status === 'fail') return 3
  if (status === 'incomplete') return 2
  if (status === 'warning') return 1
  return 0
}

function overallStatus(findings: SetupFinding[]): 'pass' | 'fail' | 'incomplete' {
  const highest = findings.reduce((rank, item) => Math.max(rank, statusRank(item.status)), 0)
  if (highest >= 3) return 'fail'
  if (highest >= 2) return 'incomplete'
  return 'pass'
}
export interface DiscordSetupCheckDependencies {
  /** A fixture environment is accepted for tests; production reads process.env. */
  env?: Record<string, string | undefined>
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  maxResponseBytes?: number
}

export interface DiscordSetupReport {
  status: 'pass' | 'fail' | 'incomplete'
  findings: SetupFinding[]
  warnings: string[]
  counts: {
    configuredResponderRoles: number
    activeMappings: number
    validatedMappings: number
    checkedMembers: number
    exposedRoleOverwrites: number
    exposedMemberOverwrites: number
  }
  readiness: {
    chatEnabled: boolean
    credentialReady: boolean
    retentionReady: boolean
    publicReady: boolean
  }
}

interface SetupConfig {
  chatEnabled: boolean
  applicationId: string
  publicKey: string
  botToken: string
  guildId: string
  channelId: string
  responderRoleIds: string[]
  supabaseUrl: string
  supabaseAnonKey: string
  serviceRoleKey: string
  chatTokenPepper: string
  cronSecret: string
}

interface RawDiscordApplication {
  id?: unknown
}

interface RawDiscordUser {
  id?: unknown
  bot?: unknown
}

interface RawDiscordGuild {
  id?: unknown
  owner_id?: unknown
  unavailable?: unknown
}

interface RawDiscordChannel {
  id?: unknown
  guild_id?: unknown
  type?: unknown
  permission_overwrites?: unknown
}

interface RawDiscordMember {
  user?: { id?: unknown; bot?: unknown } | null
  roles?: unknown
}

interface SetupMapping {
  discordUserId: string
  userId: string
  active: boolean
}

class SetupProbeError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'SetupProbeError'
    this.code = code
  }
}

function environmentValue(
  dependencies: DiscordSetupCheckDependencies,
  name: string,
): string | null {
  const source = dependencies.env ?? process.env
  const value = source[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isAllowedSupabaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    const localHttp = parsed.protocol === 'http:'
      && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    return parsed.protocol === 'https:' || localHttp
  } catch {
    return false
  }
}

function parseResponderRoleIds(value: string | null): { values: string[]; invalid: boolean } {
  if (!value) return { values: [], invalid: true }
  const values = value.split(',').map((item) => item.trim()).filter(Boolean)
  const invalid = values.length === 0
    || values.some((item) => !isDiscordSnowflake(item))
    || new Set(values).size !== values.length
  return { values, invalid }
}

function readSetupConfig(dependencies: DiscordSetupCheckDependencies): {
  config: SetupConfig | null
  findings: SetupFinding[]
  readiness: DiscordSetupReport['readiness']
} {
  const names = {
    applicationId: 'DISCORD_APPLICATION_ID',
    publicKey: 'DISCORD_PUBLIC_KEY',
    botToken: 'DISCORD_BOT_TOKEN',
    guildId: 'DISCORD_GUILD_ID',
    channelId: 'DISCORD_CHAT_CHANNEL_ID',
    responderRoleIds: 'DISCORD_CHAT_STAFF_ROLE_IDS',
    supabaseUrl: 'NEXT_PUBLIC_SUPABASE_URL',
    supabaseAnonKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    serviceRoleKey: 'SUPABASE_SERVICE_ROLE_KEY',
    chatTokenPepper: 'CHAT_TOKEN_PEPPER',
    cronSecret: 'CRON_SECRET',
  } as const
  const raw = Object.fromEntries(
    Object.entries(names).map(([key, name]) => [key, environmentValue(dependencies, name)]),
  ) as Record<keyof typeof names, string | null>
  const missing = Object.entries(raw)
    .filter(([, value]) => value === null)
    .map(([key]) => names[key as keyof typeof names])
  const invalid: string[] = []
  const roleParse = parseResponderRoleIds(raw.responderRoleIds)
  if (raw.applicationId && !isDiscordSnowflake(raw.applicationId)) invalid.push(names.applicationId)
  if (raw.publicKey && !isDiscordPublicKey(raw.publicKey)) invalid.push(names.publicKey)
  if (raw.guildId && !isDiscordSnowflake(raw.guildId)) invalid.push(names.guildId)
  if (raw.channelId && !isDiscordSnowflake(raw.channelId)) invalid.push(names.channelId)
  if (raw.responderRoleIds && roleParse.invalid) invalid.push(names.responderRoleIds)
  if (raw.supabaseUrl && !isAllowedSupabaseUrl(raw.supabaseUrl)) invalid.push(names.supabaseUrl)
  if (raw.chatTokenPepper && !raw.chatTokenPepper.trim()) invalid.push(names.chatTokenPepper)
  if (raw.cronSecret && (raw.cronSecret.length < 32 || /\s/u.test(raw.cronSecret))) invalid.push(names.cronSecret)

  const source = dependencies.env ?? process.env
  const enabledValue = source.CHAT_ENABLED?.trim().toLowerCase() ?? ''
  const chatEnabled = enabledValue === 'true'
  if (enabledValue !== '' && enabledValue !== 'true' && enabledValue !== 'false') invalid.push('CHAT_ENABLED')

  const findings: SetupFinding[] = []
  if (missing.length > 0) {
    findings.push(finding('configuration', 'incomplete', `Required configuration is missing: ${missing.join(', ')}.`))
  }
  if (invalid.length > 0) {
    findings.push(finding('configuration', 'fail', `Configuration values are invalid: ${[...new Set(invalid)].join(', ')}.`))
  }
  if (missing.length === 0 && invalid.length === 0) {
    findings.push(finding('configuration', 'pass', 'Required server configuration is present and syntactically valid.'))
  }
  if (!chatEnabled && missing.length === 0 && invalid.length === 0) {
    findings.push(finding('chat_feature_flag', 'warning', 'CHAT_ENABLED is false; setup inspection is allowed, but public chat remains disabled.'))
  }

  const credentialReady = missing.length === 0 && invalid.length === 0
  const retentionReady = Boolean(raw.cronSecret && raw.cronSecret.length >= 32 && !/\s/u.test(raw.cronSecret))
  const readiness = {
    chatEnabled,
    credentialReady,
    retentionReady,
    publicReady: credentialReady && retentionReady && chatEnabled,
  }
  if (!credentialReady) return { config: null, findings, readiness }

  return {
    config: {
      chatEnabled,
      applicationId: raw.applicationId!,
      publicKey: raw.publicKey!,
      botToken: raw.botToken!,
      guildId: raw.guildId!,
      channelId: raw.channelId!,
      responderRoleIds: roleParse.values,
      supabaseUrl: raw.supabaseUrl!,
      supabaseAnonKey: raw.supabaseAnonKey!,
      serviceRoleKey: raw.serviceRoleKey!,
      chatTokenPepper: raw.chatTokenPepper!,
      cronSecret: raw.cronSecret!,
    },
    findings,
    readiness,
  }
}

function joinSupabasePath(base: string, path: string): string {
  const url = new URL(base)
  const prefix = url.pathname.replace(/\/$/u, '')
  url.pathname = `${prefix}${path}`
  url.search = ''
  return url.toString()
}

function setupHeaders(config: SetupConfig, contentType = false): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  }
}

async function boundedResponseText(response: Response, maxBytes: number, deadlineAt: number): Promise<string> {
  const contentLength = response.headers.get('content-length')
  if (contentLength !== null) {
    const parsed = Number(contentLength)
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maxBytes) throw new SetupProbeError('response_limit')
  }
  if (!response.body) {
    const text = await raceUntil(response.text(), deadlineAt)
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw new SetupProbeError('response_limit')
    return text
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await raceUntil(reader.read(), deadlineAt)
      if (next.done) break
      if (!next.value || !Number.isSafeInteger(next.value.byteLength)) throw new SetupProbeError('response_malformed')
      total += next.value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new SetupProbeError('response_limit')
      }
      chunks.push(new Uint8Array(next.value))
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    try { reader.releaseLock() } catch { /* best effort */ }
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

async function raceUntil<T>(promise: Promise<T>, deadlineAt: number): Promise<T> {
  const remaining = deadlineAt - Date.now()
  if (remaining <= 0) throw new SetupProbeError('timeout')
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SetupProbeError('timeout')), remaining)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

async function requestJson<T>(
  fetcher: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  maxResponseBytes: number,
): Promise<T> {
  const controller = new AbortController()
  const deadlineAt = Date.now() + timeoutMs
  const request = (async () => {
    let response: Response
    try {
      response = await fetcher(url, { ...init, redirect: 'error', signal: controller.signal })
    } catch {
      throw new SetupProbeError('network')
    }
    if (!response.ok) {
      if (response.status >= 500) throw new SetupProbeError('http_5xx')
      throw new SetupProbeError('http_4xx')
    }
    let body: string
    try {
      body = await boundedResponseText(response, maxResponseBytes, deadlineAt)
      return JSON.parse(body) as T
    } catch (error) {
      if (error instanceof SetupProbeError) throw error
      throw new SetupProbeError('malformed')
    }
  })()
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true
      controller.abort()
      reject(new SetupProbeError('timeout'))
    }, timeoutMs)
  })
  try {
    return await Promise.race([request, timeout])
  } catch (error) {
    if (timedOut) throw new SetupProbeError('timeout')
    if (error instanceof SetupProbeError) throw error
    throw new SetupProbeError('network')
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
  }
}

function mapRequestError(error: unknown, subject: string): SetupFinding {
  const code = error instanceof SetupProbeError ? error.code : 'unavailable'
  if (code === 'response_limit') return finding(subject, 'incomplete', 'The response exceeded the bounded setup-check limit.')
  if (code === 'timeout') return finding(subject, 'incomplete', 'The read-only request timed out.')
  if (code === 'http_4xx' || code === 'http_5xx') return finding(subject, 'incomplete', 'The read-only API request was not accepted.')
  if (code === 'malformed' || code === 'response_malformed') return finding(subject, 'incomplete', 'The read-only API response was malformed.')
  return finding(subject, 'incomplete', 'The read-only API request was unavailable.')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function parseRawRoles(value: unknown): DiscordRoleRecord[] | null {
  if (!Array.isArray(value) || value.length > 300) return null
  const parsed: DiscordRoleRecord[] = []
  for (const item of value) {
    const source = asRecord(item)
    const id = source?.id
    const permissions = source?.permissions
    if (!isDiscordSnowflake(id) || typeof permissions !== 'string' || parseDiscordPermissionBits(permissions) === null) return null
    parsed.push({
      id,
      permissions,
      managed: source?.managed === true,
      tags: asRecord(source?.tags) ? { bot_id: asRecord(source?.tags)?.bot_id as string | undefined } : undefined,
    })
  }
  return parsed
}

function parseRawMember(value: unknown): DiscordMemberRecord | null {
  const source = asRecord(value) as RawDiscordMember | null
  const id = source?.user?.id
  const roles = source?.roles
  if (!isDiscordSnowflake(id) || !Array.isArray(roles) || roles.length > 100) return null
  if (!roles.every((roleId): roleId is string => isDiscordSnowflake(roleId))) return null
  return { id, bot: source?.user?.bot === true, roles }
}

function parseRawOverwrites(value: unknown): DiscordPermissionOverwrite[] | null {
  if (!Array.isArray(value) || value.length > 300) return null
  const parsed: DiscordPermissionOverwrite[] = []
  for (const item of value) {
    const source = asRecord(item)
    const id = source?.id
    const type = source?.type
    const allow = source?.allow
    const deny = source?.deny
    if (!isDiscordSnowflake(id) || (type !== 0 && type !== 1)
      || typeof allow !== 'string' || typeof deny !== 'string'
      || parseDiscordPermissionBits(allow) === null || parseDiscordPermissionBits(deny) === null) return null
    parsed.push({ id, type, allow, deny })
  }
  return parsed
}

function parseRawMappings(value: unknown): SetupMapping[] | null {
  if (!Array.isArray(value) || value.length > DISCORD_MAX_MAPPINGS) return null
  const mappings: SetupMapping[] = []
  for (const item of value) {
    const source = asRecord(item)
    if (!isDiscordSnowflake(source?.discord_user_id) || !isUuid(source?.user_id) || typeof source?.active !== 'boolean') return null
    mappings.push({ discordUserId: source.discord_user_id, userId: source.user_id, active: source.active })
  }
  return mappings
}

function parseRpcUserId(value: unknown): string | null {
  if (isUuid(value)) return value
  const source = asRecord(value)
  if (isUuid(source?.user_id)) return source.user_id
  if (isUuid(source?.lookup_chat_discord_staff_actor)) return source.lookup_chat_discord_staff_actor
  if (Array.isArray(value) && value.length === 1) return parseRpcUserId(value[0])
  return null
}

function discordPath(path: string): string {
  return `${DISCORD_SETUP_API_V10}${path}`
}

function statusForFindings(findings: SetupFinding[]): 'pass' | 'fail' | 'incomplete' {
  return overallStatus(findings)
}

function emptyCounts(): DiscordSetupReport['counts'] {
  return {
    configuredResponderRoles: 0,
    activeMappings: 0,
    validatedMappings: 0,
    checkedMembers: 0,
    exposedRoleOverwrites: 0,
    exposedMemberOverwrites: 0,
  }
}

/**
 * Run the complete read-only setup inspection.  Every destination is built
 * from the fixed Discord API v10 base or the configured Supabase origin; no
 * caller-supplied URL, write method, channel mutation, or queue operation is
 * accepted by this function.
 */
export async function runDiscordChatSetupCheck(
  dependencies: DiscordSetupCheckDependencies = {},
): Promise<DiscordSetupReport> {
  const parsed = readSetupConfig(dependencies)
  const findings = [...parsed.findings]
  const warnings: string[] = []
  const counts = emptyCounts()
  if (!parsed.config) {
    return {
      status: statusForFindings(findings),
      findings,
      warnings,
      counts,
      readiness: parsed.readiness,
    }
  }

  const config = parsed.config
  counts.configuredResponderRoles = config.responderRoleIds.length
  const fetcher = dependencies.fetch ?? globalThis.fetch
  const timeoutMs = Number.isInteger(dependencies.timeoutMs)
    && (dependencies.timeoutMs as number) >= 100
    && (dependencies.timeoutMs as number) <= 30_000
    ? dependencies.timeoutMs as number
    : 5_000
  const maxResponseBytes = Number.isInteger(dependencies.maxResponseBytes)
    && (dependencies.maxResponseBytes as number) >= 1_024
    && (dependencies.maxResponseBytes as number) <= DISCORD_MAX_RESPONSE_BYTES
    ? dependencies.maxResponseBytes as number
    : DISCORD_MAX_RESPONSE_BYTES

  async function discordGet<T>(path: string): Promise<T> {
    return requestJson<T>(fetcher, discordPath(path), {
      method: 'GET',
      headers: {
        Authorization: `Bot ${config.botToken}`,
        Accept: 'application/json',
      },
    }, timeoutMs, maxResponseBytes)
  }

  async function supabaseGet<T>(path: string, search?: Record<string, string>): Promise<T> {
    const url = new URL(joinSupabasePath(config.supabaseUrl, path))
    for (const [key, value] of Object.entries(search ?? {})) url.searchParams.set(key, value)
    return requestJson<T>(fetcher, url.toString(), {
      method: 'GET',
      headers: setupHeaders(config),
    }, timeoutMs, maxResponseBytes)
  }

  async function lookupStaffActor(discordUserId: string): Promise<string | null> {
    const url = joinSupabasePath(config.supabaseUrl, '/rest/v1/rpc/lookup_chat_discord_staff_actor')
    const value = await requestJson<unknown>(fetcher, url, {
      method: 'POST',
      headers: setupHeaders(config, true),
      body: JSON.stringify({ p_discord_actor_id: discordUserId }),
    }, timeoutMs, maxResponseBytes)
    return parseRpcUserId(value)
  }

  async function probe<T>(name: string, request: () => Promise<T>): Promise<T | null> {
    try {
      return await request()
    } catch (error) {
      findings.push(mapRequestError(error, name))
      return null
    }
  }

  const application = await probe<RawDiscordApplication>('application_identity', () => discordGet('/oauth2/applications/@me'))
  const applicationId = asRecord(application)?.id
  if (!isDiscordSnowflake(applicationId)) {
    findings.push(finding('application_identity', 'incomplete', 'The Discord application identity could not be resolved.'))
  } else if (applicationId !== config.applicationId) {
    findings.push(finding('application_identity', 'fail', 'The Discord application identity does not match configuration.'))
  } else {
    findings.push(finding('application_identity', 'pass', 'The configured Discord application identity matches.'))
  }

  const botUser = await probe<RawDiscordUser>('bot_identity', () => discordGet('/users/@me'))
  const botUserId = asRecord(botUser)?.id
  if (!isDiscordSnowflake(botUserId) || asRecord(botUser)?.bot !== true) {
    findings.push(finding('bot_identity', 'incomplete', 'The Discord bot identity could not be resolved as a bot user.'))
  } else if (botUserId !== config.applicationId) {
    findings.push(finding('bot_identity', 'fail', 'The Discord bot identity does not match the configured application.'))
  } else {
    findings.push(finding('bot_identity', 'pass', 'The configured Discord bot identity matches the application.'))
  }
  const trustedBotId = isDiscordSnowflake(botUserId) ? botUserId : config.applicationId

  const guild = await probe<RawDiscordGuild>(`guild`, () => discordGet(`/guilds/${config.guildId}`))
  const guildId = asRecord(guild)?.id
  const ownerId = asRecord(guild)?.owner_id
  if (!isDiscordSnowflake(guildId) || guildId !== config.guildId || asRecord(guild)?.unavailable === true) {
    findings.push(finding('guild', 'fail', 'The configured Discord guild could not be verified.'))
  } else if (!isDiscordSnowflake(ownerId)) {
    findings.push(finding('guild', 'incomplete', 'The guild owner identity could not be resolved for governance warnings.'))
  } else {
    findings.push(finding('guild', 'pass', 'The configured Discord guild matches.'))
  }

  const channel = await probe<RawDiscordChannel>('channel', () => discordGet(`/channels/${config.channelId}`))
  const channelSource = asRecord(channel)
  const channelId = channelSource?.id
  const channelGuildId = channelSource?.guild_id
  const overwrites = parseRawOverwrites(channelSource?.permission_overwrites)
  if (!isDiscordSnowflake(channelId) || channelId !== config.channelId
    || !isDiscordSnowflake(channelGuildId) || channelGuildId !== config.guildId) {
    findings.push(finding('channel', 'fail', 'The configured Discord channel identity or guild relation did not match.'))
  } else if (channelSource?.type !== DISCORD_GUILD_TEXT_TYPE) {
    findings.push(finding('channel', 'fail', 'The configured channel is not a GUILD_TEXT channel.'))
  } else if (!overwrites) {
    findings.push(finding('channel', 'incomplete', 'The channel permission overwrites could not be resolved.'))
  } else {
    findings.push(finding('channel', 'pass', 'The configured GUILD_TEXT channel and guild relation match.'))
  }

  const rawRoles = await probe<unknown>('roles', () => discordGet(`/guilds/${config.guildId}/roles`))
  const roles = parseRawRoles(rawRoles)
  if (!roles) {
    findings.push(finding('roles', 'incomplete', 'The guild roles response could not be safely resolved.'))
  } else {
    const roleIds = new Set(roles.map((role) => role.id))
    if (roleIds.size !== roles.length) findings.push(finding('roles', 'incomplete', 'The guild roles response contained duplicate identities.'))
    const missingConfigured = config.responderRoleIds.filter((roleId) => !roleIds.has(roleId) || roleId === config.guildId)
    if (missingConfigured.length > 0) {
      findings.push(finding('responder_roles', 'fail', 'One or more configured responder roles are missing or resolve to @everyone.'))
    } else {
      findings.push(finding('responder_roles', 'pass', 'Configured responder roles exist and are not @everyone.'))
    }
  }

  const mappingPayload = await probe<unknown>('staff_mappings', () => supabaseGet('/rest/v1/staff_discord_identities', {
    select: 'discord_user_id,user_id,active',
    active: 'eq.true',
    limit: String(DISCORD_MAX_MAPPINGS + 1),
  }))
  const mappings = parseRawMappings(mappingPayload)
  const activeMappings = mappings?.filter((mapping) => mapping.active) ?? []
  counts.activeMappings = activeMappings.length
  if (!mappings) {
    findings.push(finding('staff_mappings', 'incomplete', 'Active staff Discord mappings could not be safely resolved.'))
  } else {
    const seenDiscordIds = new Set<string>()
    for (const mapping of mappings) {
      if (seenDiscordIds.has(mapping.discordUserId)) {
        findings.push(finding('staff_mappings', 'fail', 'Staff Discord mappings contain a duplicate identity.'))
        break
      }
      seenDiscordIds.add(mapping.discordUserId)
      if (!mapping.active) findings.push(finding('staff_mappings', 'fail', 'An inactive staff Discord mapping is present and must not authorize replies.'))
    }
    if (activeMappings.length === 0) {
      findings.push(finding('staff_mappings', 'incomplete', 'No active database-controlled staff Discord mapping is configured.'))
    }
  }

  const validatedMappingIds: string[] = []
  if (mappings) {
    for (const mapping of activeMappings) {
      try {
        const resolvedUserId = await lookupStaffActor(mapping.discordUserId)
        if (!resolvedUserId || resolvedUserId !== mapping.userId) {
          findings.push(finding('staff_mapping_lookup', 'fail', 'A staff Discord mapping did not resolve to an existing staff account.'))
          continue
        }
        validatedMappingIds.push(mapping.discordUserId)
      } catch (error) {
        findings.push(mapRequestError(error, 'staff_mapping_lookup'))
      }
    }
    counts.validatedMappings = validatedMappingIds.length
    if (validatedMappingIds.length === activeMappings.length && activeMappings.length > 0) {
      findings.push(finding('staff_mapping_lookup', 'pass', 'Every active Discord identity resolved through the staff-only lookup RPC.'))
    }
  }

  const memberIds = new Set<string>([trustedBotId, ...validatedMappingIds])
  if (overwrites) {
    for (const overwrite of overwrites) {
      const allow = parseDiscordPermissionBits(overwrite.allow)
      if (overwrite.type === 1 && allow !== null && hasDiscordPermission(allow, 'VIEW_CHANNEL')) memberIds.add(overwrite.id)
    }
  }
  if (memberIds.size > DISCORD_MAX_SPECIFIC_MEMBERS) {
    findings.push(finding('members', 'incomplete', 'The number of specific members required for a safe permission check exceeded the bound.'))
  }
  const membersById = new Map<string, DiscordMemberRecord>()
  if (memberIds.size <= DISCORD_MAX_SPECIFIC_MEMBERS) {
    for (const memberId of memberIds) {
      const rawMember = await probe<unknown>(`member`, () => discordGet(`/guilds/${config.guildId}/members/${memberId}`))
      const parsedMember = parseRawMember(rawMember)
      if (!parsedMember) {
        findings.push(finding('members', 'incomplete', 'A required Discord member response could not be safely resolved.'))
        continue
      }
      if (parsedMember.id !== memberId) {
        findings.push(finding('members', 'fail', 'A Discord member response identity did not match the requested member.'))
        continue
      }
      membersById.set(parsedMember.id, parsedMember)
    }
  }
  counts.checkedMembers = membersById.size

  const botMember = membersById.get(trustedBotId) ?? null
  if (botMember && (!botMember.bot || botMember.id !== config.applicationId)) {
    findings.push(finding('bot_member', 'fail', 'The configured bot member identity did not match the application.'))
  }
  const botManagedRoleId = roles?.find((role) => role.managed && role.tags?.bot_id === trustedBotId)?.id ?? null
  if (roles && botManagedRoleId === null) {
    findings.push(finding('bot_managed_role', 'incomplete', 'The configured bot managed role could not be identified.'))
  }

  if (roles && overwrites && isDiscordSnowflake(ownerId) && isDiscordSnowflake(guildId)) {
    const evaluation = evaluateDiscordChannelPermissions({
      guildId,
      ownerId,
      botUserId: trustedBotId,
      botManagedRoleId,
      configuredResponderRoleIds: config.responderRoleIds,
      roles,
      overwrites,
      botMember,
      mappedMemberIds: validatedMappingIds,
      membersById,
    })
    findings.push(...evaluation.findings)
    warnings.push(...evaluation.warnings)
    counts.exposedRoleOverwrites = evaluation.counts.exposedRoleOverwrites
    counts.exposedMemberOverwrites = evaluation.counts.exposedMemberOverwrites
  } else {
    findings.push(finding('permissions', 'incomplete', 'Channel permission evaluation could not be completed from verified guild data.'))
  }

  return {
    status: statusForFindings(findings),
    findings,
    warnings: [...new Set(warnings)],
    counts,
    readiness: parsed.readiness,
  }
}

export function formatDiscordSetupReport(report: DiscordSetupReport): string {
  const lines = [`Discord chat setup check: ${report.status.toUpperCase()}`]
  for (const item of report.findings) {
    lines.push(`[${item.status.toUpperCase()}] ${item.name}: ${item.detail}`)
  }
  for (const warning of report.warnings) lines.push(`[WARNING] ${warning}`)
  lines.push(`Counts: configured responder roles=${report.counts.configuredResponderRoles}, active mappings=${report.counts.activeMappings}, validated mappings=${report.counts.validatedMappings}, checked members=${report.counts.checkedMembers}, exposed role grants=${report.counts.exposedRoleOverwrites}, exposed member grants=${report.counts.exposedMemberOverwrites}.`)
  lines.push(`Readiness: CHAT_ENABLED=${report.readiness.chatEnabled ? 'true' : 'false'}, credentialReady=${report.readiness.credentialReady ? 'true' : 'false'}, retentionReady=${report.readiness.retentionReady ? 'true' : 'false'}, publicReady=${report.readiness.publicReady ? 'true' : 'false'}.`)
  lines.push('No channels, roles, mappings, queue state, messages, transcripts, emails, or secrets were modified or printed.')
  return lines.join('\n')
}
