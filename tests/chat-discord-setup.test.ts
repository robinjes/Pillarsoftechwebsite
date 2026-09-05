import { describe, expect, it } from 'vitest'

import {
  DISCORD_PERMISSION_BITS,
  effectiveDiscordPermissions,
  evaluateDiscordChannelPermissions,
  type ChannelPermissionEvaluationInput,
  type DiscordMemberRecord,
  type DiscordPermissionOverwrite,
  type DiscordRoleRecord,
} from '@/lib/chat-discord-permissions.mts'
import {
  formatDiscordSetupReport,
  runDiscordChatSetupCheck,
} from '@/lib/chat-discord-setup.mts'

const guildId = '900000000000000001'
const botId = '900000000000000002'
const botRoleId = '900000000000000003'
const staffRoleId = '900000000000000004'
const otherRoleId = '900000000000000005'
const staffId = '900000000000000006'
const ownerId = '900000000000000007'

const bits = (...names: (keyof typeof DISCORD_PERMISSION_BITS)[]) => names
  .reduce((value, name) => value | DISCORD_PERMISSION_BITS[name], BigInt(0))
  .toString()

function roles(extra: DiscordRoleRecord[] = []): DiscordRoleRecord[] {
  return [
    { id: guildId, permissions: '0', managed: false },
    { id: botRoleId, permissions: bits('VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'CREATE_PUBLIC_THREADS', 'SEND_MESSAGES_IN_THREADS', 'MANAGE_THREADS'), managed: true, tags: { bot_id: botId } },
    { id: staffRoleId, permissions: bits('VIEW_CHANNEL', 'READ_MESSAGE_HISTORY', 'USE_APPLICATION_COMMANDS'), managed: false },
    ...extra,
  ]
}

function baseOverwrites(extra: DiscordPermissionOverwrite[] = []): DiscordPermissionOverwrite[] {
  return [
    { id: guildId, type: 0, allow: '0', deny: bits('VIEW_CHANNEL') },
    { id: staffRoleId, type: 0, allow: bits('VIEW_CHANNEL'), deny: '0' },
    { id: botRoleId, type: 0, allow: bits('VIEW_CHANNEL'), deny: '0' },
    ...extra,
  ]
}

function member(id: string, memberRoles: string[], bot = false): DiscordMemberRecord {
  return { id, roles: memberRoles, bot }
}

function input(overrides: Partial<ChannelPermissionEvaluationInput> = {}): ChannelPermissionEvaluationInput {
  const botMember = member(botId, [botRoleId], true)
  const staffMember = member(staffId, [staffRoleId])
  return {
    guildId,
    ownerId,
    botUserId: botId,
    botManagedRoleId: botRoleId,
    configuredResponderRoleIds: [staffRoleId],
    roles: roles(),
    overwrites: baseOverwrites(),
    botMember,
    mappedMemberIds: [staffId],
    membersById: new Map([[botId, botMember], [staffId, staffMember]]),
    ...overrides,
  }
}

describe('Discord channel permission evaluator', () => {
  it('passes a private channel with mapped staff and the required bot permissions', () => {
    const result = evaluateDiscordChannelPermissions(input())

    expect(result.status).toBe('pass')
    expect(result.findings).toContainEqual(expect.objectContaining({ name: 'everyone_view_deny', status: 'pass' }))
    expect(result.findings).toContainEqual(expect.objectContaining({ name: 'bot_permissions', status: 'pass' }))
  })

  it('rejects a public @everyone overwrite even when a deny is also present', () => {
    const result = evaluateDiscordChannelPermissions(input({
      overwrites: [{ id: guildId, type: 0, allow: bits('VIEW_CHANNEL'), deny: bits('VIEW_CHANNEL') }],
    }))

    expect(result.status).toBe('fail')
    expect(result.findings).toContainEqual(expect.objectContaining({ name: 'everyone_view_deny', status: 'fail' }))
  })

  it('rejects a non-approved role with a VIEW_CHANNEL allow', () => {
    const result = evaluateDiscordChannelPermissions(input({
      roles: roles([{ id: otherRoleId, permissions: '0', managed: false }]),
      overwrites: baseOverwrites([{ id: otherRoleId, type: 0, allow: bits('VIEW_CHANNEL'), deny: '0' }]),
    }))

    expect(result.status).toBe('fail')
    expect(result.findings).toContainEqual(expect.objectContaining({ name: 'role_overwrites', status: 'fail' }))
  })

  it('warns instead of failing solely on an unapproved Administrator role grant', () => {
    const adminRoleId = '900000000000000099'
    const result = evaluateDiscordChannelPermissions(input({
      roles: roles([{ id: adminRoleId, permissions: bits('ADMINISTRATOR'), managed: false }]),
      overwrites: baseOverwrites([{ id: adminRoleId, type: 0, allow: bits('VIEW_CHANNEL'), deny: '0' }]),
    }))

    expect(result.status).toBe('pass')
    expect(result.warnings.join(' ')).toMatch(/Administrator/iu)
    expect(result.findings).toContainEqual(expect.objectContaining({ name: 'role_overwrites', status: 'warning' }))
  })

  it('rejects a direct member view grant without an active mapped responder', () => {
    const outsiderId = '900000000000000008'
    const outsider = member(outsiderId, [])
    const result = evaluateDiscordChannelPermissions(input({
      overwrites: baseOverwrites([{ id: outsiderId, type: 1, allow: bits('VIEW_CHANNEL'), deny: '0' }]),
      membersById: new Map([[botId, member(botId, [botRoleId], true)], [staffId, member(staffId, [staffRoleId])], [outsiderId, outsider]]),
    }))

    expect(result.status).toBe('fail')
    expect(result.counts.exposedMemberOverwrites).toBe(1)
    expect(result.findings).toContainEqual(expect.objectContaining({ name: 'member_overwrites', status: 'fail' }))
  })

  it('warns, but does not misreport, guild-owner or Administrator bypass access', () => {
    const adminRoleId = '900000000000000009'
    const admin = member(staffId, [staffRoleId, adminRoleId])
    const result = evaluateDiscordChannelPermissions(input({
      roles: roles([{ id: adminRoleId, permissions: bits('ADMINISTRATOR'), managed: false }]),
      membersById: new Map([[botId, member(botId, [botRoleId], true)], [staffId, admin]]),
    }))

    expect(result.status).toBe('pass')
    expect(result.warnings.join(' ')).toMatch(/Administrator|owner/iu)
    expect(result.findings).toContainEqual(expect.objectContaining({ name: 'staff_permissions', status: 'warning' }))
  })

  it('fails when the bot lacks a required permission', () => {
    const insufficientBotRole = { id: botRoleId, permissions: bits('VIEW_CHANNEL'), managed: true, tags: { bot_id: botId } }
    const result = evaluateDiscordChannelPermissions(input({
      roles: [roles().find((role) => role.id === guildId)!, insufficientBotRole, roles().find((role) => role.id === staffRoleId)!],
    }))

    expect(result.status).toBe('fail')
    expect(result.findings).toContainEqual(expect.objectContaining({ name: 'bot_permissions', status: 'fail' }))
  })

  it('applies everyone, role, and member overwrites in the Discord order', () => {
    const memberUnderTest = member(staffId, [staffRoleId])
    const evaluated = effectiveDiscordPermissions(memberUnderTest, {
      guildId,
      ownerId,
      roles: [
        { id: guildId, permissions: bits('VIEW_CHANNEL'), managed: false },
        { id: staffRoleId, permissions: bits('VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'), managed: false },
      ],
      overwrites: [
        { id: guildId, type: 0, allow: '0', deny: bits('VIEW_CHANNEL') },
        { id: staffRoleId, type: 0, allow: bits('VIEW_CHANNEL'), deny: bits('READ_MESSAGE_HISTORY') },
        { id: staffId, type: 1, allow: bits('READ_MESSAGE_HISTORY'), deny: bits('VIEW_CHANNEL') },
      ],
    })

    expect(evaluated.administrator).toBe(false)
    expect(evaluated.permissions & DISCORD_PERMISSION_BITS.VIEW_CHANNEL).toBe(BigInt(0))
    expect(evaluated.permissions & DISCORD_PERMISSION_BITS.READ_MESSAGE_HISTORY).toBe(DISCORD_PERMISSION_BITS.READ_MESSAGE_HISTORY)
  })
})

const applicationId = botId
const channelId = '900000000000000010'
const staffUserId = '00000000-0000-4000-8000-000000000010'
const serviceRoleKey = 'service-role-secret-for-test'
const botToken = 'bot-token-secret-for-test'

function setupEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    CHAT_ENABLED: 'false',
    DISCORD_APPLICATION_ID: applicationId,
    DISCORD_PUBLIC_KEY: 'a'.repeat(64),
    DISCORD_BOT_TOKEN: botToken,
    DISCORD_GUILD_ID: guildId,
    DISCORD_CHAT_CHANNEL_ID: channelId,
    DISCORD_CHAT_STAFF_ROLE_IDS: staffRoleId,
    NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.test',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-secret',
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    CHAT_TOKEN_PEPPER: 'chat-pepper-secret',
    CRON_SECRET: 'cron-secret-01234567890123456789012345',
    ...overrides,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

interface SetupFixtureOverrides {
  applicationId?: string
  botId?: string
  channelOverwrites?: DiscordPermissionOverwrite[]
  roles?: DiscordRoleRecord[]
  mappings?: Array<{ discord_user_id: string; user_id: string; active: boolean }>
  rpcUserId?: string | null
  members?: Record<string, DiscordMemberRecord>
}

function makeSetupFetcher(overrides: SetupFixtureOverrides = {}) {
  const calls: Array<{ url: string; method: string; headers: Headers; body: string | null; redirect: RequestRedirect | undefined }> = []
  const fixtureRoles = overrides.roles ?? roles()
  const fixtureMembers: Record<string, DiscordMemberRecord> = {
    [botId]: member(botId, [botRoleId], true),
    [staffId]: member(staffId, [staffRoleId]),
    ...overrides.members,
  }
  const fixtureMappings = overrides.mappings ?? [{ discord_user_id: staffId, user_id: staffUserId, active: true }]
  const mappedDiscordId = fixtureMappings[0]?.discord_user_id ?? staffId
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const headers = new Headers(init?.headers)
    calls.push({ url, method, headers, body: typeof init?.body === 'string' ? init.body : null, redirect: init?.redirect })
    if (url === 'https://discord.com/api/v10/oauth2/applications/@me') {
      return jsonResponse({ id: overrides.applicationId ?? applicationId })
    }
    if (url === 'https://discord.com/api/v10/users/@me') {
      return jsonResponse({ id: overrides.botId ?? botId, bot: true })
    }
    if (url === `https://discord.com/api/v10/guilds/${guildId}`) {
      return jsonResponse({ id: guildId, owner_id: ownerId })
    }
    if (url === `https://discord.com/api/v10/channels/${channelId}`) {
      return jsonResponse({ id: channelId, guild_id: guildId, type: 0, permission_overwrites: overrides.channelOverwrites ?? baseOverwrites() })
    }
    if (url === `https://discord.com/api/v10/guilds/${guildId}/roles`) return jsonResponse(fixtureRoles)
    if (url === `https://supabase.example.test/rest/v1/staff_discord_identities?select=discord_user_id%2Cuser_id%2Cactive&active=eq.true&limit=26`) {
      return jsonResponse(fixtureMappings)
    }
    if (url === 'https://supabase.example.test/rest/v1/rpc/lookup_chat_discord_staff_actor') {
      return jsonResponse(overrides.rpcUserId === undefined ? staffUserId : overrides.rpcUserId)
    }
    const memberMatch = new RegExp(`^https://discord\\.com/api/v10/guilds/${guildId}/members/(\\d+)$`, 'u').exec(url)
    if (memberMatch) {
      const selected = fixtureMembers[memberMatch[1]!] ?? { id: memberMatch[1]!, bot: false, roles: [] }
      return jsonResponse({ user: { id: selected.id, bot: selected.bot }, roles: selected.roles })
    }
    throw new Error(`unexpected destination ${url}`)
  }
  return { fetcher, calls, mappedDiscordId }
}

describe('read-only Discord setup transport', () => {
  it('uses only fixed GET destinations plus the single staff lookup RPC POST', async () => {
    const fixture = makeSetupFetcher()
    const report = await runDiscordChatSetupCheck({ env: setupEnv(), fetch: fixture.fetcher })

    expect(report.status).toBe('pass')
    expect(fixture.calls.map((call) => call.method)).toEqual([
      'GET', 'GET', 'GET', 'GET', 'GET', 'GET', 'POST', 'GET', 'GET',
    ])
    expect(fixture.calls.find((call) => call.method === 'POST')?.url).toBe(
      'https://supabase.example.test/rest/v1/rpc/lookup_chat_discord_staff_actor',
    )
    expect(fixture.calls.filter((call) => call.url.includes('/rpc/'))).toHaveLength(1)
    expect(fixture.calls.filter((call) => call.url.includes('/guilds/') && call.url.includes('/members/'))).toHaveLength(2)
    expect(fixture.calls.every((call) => call.redirect === 'error')).toBe(true)
    expect(fixture.calls.some((call) => ['PATCH', 'DELETE', 'PUT'].includes(call.method))).toBe(false)
  })

  it('fails closed on application identity mismatch without exposing credentials', async () => {
    const fixture = makeSetupFetcher({ applicationId: '900000000000000099' })
    const report = await runDiscordChatSetupCheck({ env: setupEnv(), fetch: fixture.fetcher })
    const output = formatDiscordSetupReport(report)

    expect(report.status).toBe('fail')
    expect(report.findings).toContainEqual(expect.objectContaining({ name: 'application_identity', status: 'fail' }))
    expect(output).not.toContain(botToken)
    expect(output).not.toContain(serviceRoleKey)
    expect(output).not.toContain('anon-key-secret')
    expect(output).not.toContain('chat-pepper-secret')
    expect(output).not.toContain('visitor transcript')
  })

  it('rejects public everyone, non-approved role, and direct member exposure from mocked API data', async () => {
    const outsiderId = '900000000000000099'
    const fixture = makeSetupFetcher({
      roles: [...roles(), { id: otherRoleId, permissions: '0', managed: false }],
      channelOverwrites: [
        { id: guildId, type: 0, allow: bits('VIEW_CHANNEL'), deny: bits('VIEW_CHANNEL') },
        { id: otherRoleId, type: 0, allow: bits('VIEW_CHANNEL'), deny: '0' },
        { id: outsiderId, type: 1, allow: bits('VIEW_CHANNEL'), deny: '0' },
      ],
      members: { [outsiderId]: member(outsiderId, []) },
    })
    const report = await runDiscordChatSetupCheck({ env: setupEnv(), fetch: fixture.fetcher })

    expect(report.status).toBe('fail')
    expect(report.findings.filter((item) => item.status === 'fail').map((item) => item.name)).toEqual(
      expect.arrayContaining(['everyone_view_deny', 'role_overwrites', 'member_overwrites']),
    )
  })

  it('warns for a direct Administrator member exposure while preserving the governance warning', async () => {
    const adminRoleId = '900000000000000099'
    const adminId = '900000000000000098'
    const fixture = makeSetupFetcher({
      roles: [...roles(), { id: adminRoleId, permissions: bits('ADMINISTRATOR'), managed: false }],
      channelOverwrites: [...baseOverwrites(), { id: adminId, type: 1, allow: bits('VIEW_CHANNEL'), deny: '0' }],
      members: { [adminId]: member(adminId, [adminRoleId]) },
    })
    const report = await runDiscordChatSetupCheck({ env: setupEnv(), fetch: fixture.fetcher })

    expect(report.status).toBe('pass')
    expect(report.warnings.join(' ')).toMatch(/Administrator|owner/iu)
  })

  it('rejects a bot permission deficiency and an inactive or non-staff mapping', async () => {
    const insufficientBotRole = { id: botRoleId, permissions: bits('VIEW_CHANNEL'), managed: true, tags: { bot_id: botId } }
    const fixture = makeSetupFetcher({
      roles: [roles().find((role) => role.id === guildId)!, insufficientBotRole, roles().find((role) => role.id === staffRoleId)!],
      mappings: [{ discord_user_id: '999999999999999999', user_id: staffUserId, active: false }],
    })
    const report = await runDiscordChatSetupCheck({ env: setupEnv(), fetch: fixture.fetcher })

    expect(report.status).toBe('fail')
    expect(report.findings).toContainEqual(expect.objectContaining({ name: 'bot_permissions', status: 'fail' }))
    expect(report.findings).toContainEqual(expect.objectContaining({ name: 'staff_mappings', status: 'fail' }))
  })

  it('fails when the staff-only mapping lookup returns no existing staff account', async () => {
    const fixture = makeSetupFetcher({ rpcUserId: null })
    const report = await runDiscordChatSetupCheck({ env: setupEnv(), fetch: fixture.fetcher })

    expect(report.status).toBe('fail')
    expect(report.findings).toContainEqual(expect.objectContaining({ name: 'staff_mapping_lookup', status: 'fail' }))
  })

  it('accepts two active Discord identities linked to one existing staff UUID', async () => {
    const secondDiscordId = '900000000000000011'
    const fixture = makeSetupFetcher({
      mappings: [
        { discord_user_id: staffId, user_id: staffUserId, active: true },
        { discord_user_id: secondDiscordId, user_id: staffUserId, active: true },
      ],
      members: { [secondDiscordId]: member(secondDiscordId, [staffRoleId]) },
    })
    const report = await runDiscordChatSetupCheck({ env: setupEnv(), fetch: fixture.fetcher })

    expect(report.status).toBe('pass')
    expect(report.counts.validatedMappings).toBe(2)
  })

  it('fails closed when a permission bitfield is malformed rather than skipping the grant', async () => {
    const fixture = makeSetupFetcher({
      channelOverwrites: [{ id: guildId, type: 0, allow: '0', deny: bits('VIEW_CHANNEL') }, {
        id: staffRoleId,
        type: 0,
        allow: 'not-a-bitfield',
        deny: '0',
      }],
    })
    const report = await runDiscordChatSetupCheck({ env: setupEnv(), fetch: fixture.fetcher })

    expect(report.status).toBe('incomplete')
    expect(report.findings).toContainEqual(expect.objectContaining({ name: 'channel', status: 'incomplete' }))
  })

  it('bounds a hanging Discord response body and reports a safe timeout', async () => {
    let first = true
    const fetcher = async (): Promise<Response> => {
      if (first) {
        first = false
        return new Response(new ReadableStream<Uint8Array>({ start() { /* intentionally never closes */ } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return jsonResponse({})
    }
    const started = Date.now()
    const report = await runDiscordChatSetupCheck({ env: setupEnv(), fetch: fetcher, timeoutMs: 100 })

    expect(Date.now() - started).toBeLessThan(1_000)
    expect(report.findings).toContainEqual(expect.objectContaining({ name: 'application_identity', status: 'incomplete' }))
  })

  it('returns sanitized incomplete readiness without making requests when secrets/config are missing', async () => {
    const calls: string[] = []
    const report = await runDiscordChatSetupCheck({
      env: { CHAT_ENABLED: 'false' },
      fetch: async (input) => {
        calls.push(String(input))
        return jsonResponse({})
      },
    })
    const output = formatDiscordSetupReport(report)

    expect(report.status).toBe('incomplete')
    expect(calls).toEqual([])
    expect(output).toContain('DISCORD_BOT_TOKEN')
    expect(output).not.toContain(botToken)
    expect(output).not.toContain(serviceRoleKey)
  })
})
