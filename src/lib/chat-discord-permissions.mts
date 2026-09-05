/**
 * Read-only Discord setup inspection primitives.
 *
 * This module deliberately has no server-only marker or Supabase/Discord
 * client dependency.  The permission evaluator is pure so the setup command
 * can be exercised with fixtures without ever contacting an external service.
 */

export const DISCORD_SETUP_API_V10 = 'https://discord.com/api/v10'
export const DISCORD_GUILD_TEXT_TYPE = 0
export const DISCORD_MAX_RESPONSE_BYTES = 256 * 1024
export const DISCORD_MAX_MAPPINGS = 25
export const DISCORD_MAX_SPECIFIC_MEMBERS = 50

export const DISCORD_PERMISSION_BITS = {
  VIEW_CHANNEL: BigInt(1) << BigInt(10),
  SEND_MESSAGES: BigInt(1) << BigInt(11),
  READ_MESSAGE_HISTORY: BigInt(1) << BigInt(16),
  USE_APPLICATION_COMMANDS: BigInt(1) << BigInt(31),
  MANAGE_THREADS: BigInt(1) << BigInt(34),
  CREATE_PUBLIC_THREADS: BigInt(1) << BigInt(35),
  SEND_MESSAGES_IN_THREADS: BigInt(1) << BigInt(38),
  ADMINISTRATOR: BigInt(1) << BigInt(3),
} as const

export const DISCORD_BOT_REQUIRED_PERMISSIONS = [
  'VIEW_CHANNEL',
  'SEND_MESSAGES',
  'READ_MESSAGE_HISTORY',
  'CREATE_PUBLIC_THREADS',
  'SEND_MESSAGES_IN_THREADS',
  'MANAGE_THREADS',
] as const

export const DISCORD_STAFF_REQUIRED_PERMISSIONS = [
  'VIEW_CHANNEL',
  'READ_MESSAGE_HISTORY',
  'USE_APPLICATION_COMMANDS',
] as const

const DISCORD_SNOWFLAKE = /^\d{1,30}$/u
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const PUBLIC_KEY = /^[0-9a-f]{64}$/iu

export type SetupFindingStatus = 'pass' | 'fail' | 'incomplete' | 'warning'

export interface SetupFinding {
  name: string
  status: SetupFindingStatus
  detail: string
}

export interface DiscordRoleRecord {
  id: string
  permissions: string
  managed: boolean
  tags?: { bot_id?: string }
}

export interface DiscordPermissionOverwrite {
  id: string
  type: 0 | 1
  allow: string
  deny: string
}

export interface DiscordMemberRecord {
  id: string
  bot: boolean
  roles: string[]
}

export interface ChannelPermissionEvaluationInput {
  guildId: string
  ownerId: string
  botUserId: string
  botManagedRoleId: string | null
  configuredResponderRoleIds: string[]
  roles: DiscordRoleRecord[]
  overwrites: DiscordPermissionOverwrite[]
  botMember: DiscordMemberRecord | null
  mappedMemberIds: string[]
  membersById: ReadonlyMap<string, DiscordMemberRecord>
}

export interface EffectivePermissionResult {
  permissions: bigint
  administrator: boolean
  owner: boolean
  missingRole: boolean
}

export interface ChannelPermissionEvaluation {
  status: 'pass' | 'fail' | 'incomplete'
  findings: SetupFinding[]
  warnings: string[]
  counts: {
    exposedRoleOverwrites: number
    exposedMemberOverwrites: number
    mappedMembersChecked: number
  }
}

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

export function isDiscordSnowflake(value: unknown): value is string {
  return typeof value === 'string' && DISCORD_SNOWFLAKE.test(value)
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

export function isDiscordPublicKey(value: unknown): value is string {
  return typeof value === 'string' && PUBLIC_KEY.test(value)
}

export function parseDiscordPermissionBits(value: unknown): bigint | null {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') return null
  const text = String(value)
  if (!/^\d{1,40}$/u.test(text)) return null
  try {
    return BigInt(text)
  } catch {
    return null
  }
}

export function hasDiscordPermission(value: bigint, permission: keyof typeof DISCORD_PERMISSION_BITS): boolean {
  return (value & DISCORD_PERMISSION_BITS[permission]) === DISCORD_PERMISSION_BITS[permission]
}

function applyOverwrite(value: bigint, deny: bigint, allow: bigint): bigint {
  return (value & ~deny) | allow
}

function roleMapFor(roles: DiscordRoleRecord[]): Map<string, DiscordRoleRecord> {
  return new Map(roles.map((role) => [role.id, role]))
}

/**
 * Discord's channel overwrite order for one member: everyone base, the
 * member's role union, the @everyone overwrite, aggregate role deny/allow,
 * then member deny/allow.  Administrator and guild-owner access bypasses
 * overwrites, but callers must disclose that governance fact.
 */
export function effectiveDiscordPermissions(
  member: DiscordMemberRecord,
  input: Pick<ChannelPermissionEvaluationInput, 'guildId' | 'ownerId' | 'roles' | 'overwrites'>,
): EffectivePermissionResult {
  const roles = roleMapFor(input.roles)
  const everyone = roles.get(input.guildId)
  let missingRole = everyone === undefined
  let permissions = parseDiscordPermissionBits(everyone?.permissions) ?? BigInt(0)

  for (const roleId of member.roles) {
    const role = roles.get(roleId)
    if (!role) {
      missingRole = true
      continue
    }
    const rolePermissions = parseDiscordPermissionBits(role.permissions)
    if (rolePermissions === null) {
      missingRole = true
      continue
    }
    permissions |= rolePermissions
  }

  const owner = member.id === input.ownerId
  const administrator = owner || hasDiscordPermission(permissions, 'ADMINISTRATOR')
  if (administrator) return { permissions, administrator: true, owner, missingRole }

  const everyoneOverwrites = input.overwrites.filter(
    (overwrite) => overwrite.type === 0 && overwrite.id === input.guildId,
  )
  for (const overwrite of everyoneOverwrites) {
    const deny = parseDiscordPermissionBits(overwrite.deny)
    const allow = parseDiscordPermissionBits(overwrite.allow)
    if (deny === null || allow === null) {
      missingRole = true
      continue
    }
    permissions = applyOverwrite(permissions, deny, allow)
  }

  let roleDeny = BigInt(0)
  let roleAllow = BigInt(0)
  for (const overwrite of input.overwrites) {
    if (overwrite.type !== 0 || overwrite.id === input.guildId || !member.roles.includes(overwrite.id)) continue
    const deny = parseDiscordPermissionBits(overwrite.deny)
    const allow = parseDiscordPermissionBits(overwrite.allow)
    if (deny === null || allow === null) {
      missingRole = true
      continue
    }
    roleDeny |= deny
    roleAllow |= allow
  }
  permissions = applyOverwrite(permissions, roleDeny, roleAllow)

  let memberDeny = BigInt(0)
  let memberAllow = BigInt(0)
  for (const overwrite of input.overwrites) {
    if (overwrite.type !== 1 || overwrite.id !== member.id) continue
    const deny = parseDiscordPermissionBits(overwrite.deny)
    const allow = parseDiscordPermissionBits(overwrite.allow)
    if (deny === null || allow === null) {
      missingRole = true
      continue
    }
    memberDeny |= deny
    memberAllow |= allow
  }
  permissions = applyOverwrite(permissions, memberDeny, memberAllow)
  return { permissions, administrator: false, owner, missingRole }
}

function hasAnyConfiguredRole(member: DiscordMemberRecord, configuredRoleIds: Set<string>): boolean {
  return member.roles.some((roleId) => configuredRoleIds.has(roleId))
}

/**
 * Evaluate privacy and effective bot/staff permissions from already-validated
 * Discord objects.  It never resolves identities or performs network calls;
 * unresolved data is an incomplete/fail finding instead of a success.
 */
export function evaluateDiscordChannelPermissions(
  input: ChannelPermissionEvaluationInput,
): ChannelPermissionEvaluation {
  const findings: SetupFinding[] = []
  const warnings: string[] = [
    'Guild owners and members with Administrator bypass channel overwrites; the channel is not hidden from them.',
  ]
  const roles = roleMapFor(input.roles)
  const configuredRoleIds = new Set(input.configuredResponderRoleIds)
  const botMember = input.botMember
  let exposedRoleOverwrites = 0
  let exposedMemberOverwrites = 0

  if (!roles.has(input.guildId)) {
    findings.push(finding('everyone_role', 'incomplete', 'The guild @everyone role could not be resolved.'))
  }
  if (!input.botManagedRoleId || !roles.has(input.botManagedRoleId)) {
    findings.push(finding('bot_managed_role', 'incomplete', 'The configured bot managed role could not be resolved.'))
  }

  for (const roleId of configuredRoleIds) {
    if (roleId === input.guildId) {
      findings.push(finding('responder_roles', 'fail', 'A configured responder role cannot be @everyone.'))
    } else if (!roles.has(roleId)) {
      findings.push(finding('responder_roles', 'incomplete', 'A configured responder role does not exist in the guild.'))
    }
  }

  const everyoneOverwrites = input.overwrites.filter(
    (overwrite) => overwrite.type === 0 && overwrite.id === input.guildId,
  )
  if (everyoneOverwrites.length !== 1) {
    findings.push(finding('everyone_view_deny', 'incomplete', 'The channel must expose exactly one @everyone overwrite.'))
  } else {
    const overwrite = everyoneOverwrites[0]!
    const allow = parseDiscordPermissionBits(overwrite.allow)
    const deny = parseDiscordPermissionBits(overwrite.deny)
    if (allow === null || deny === null) {
      findings.push(finding('everyone_view_deny', 'incomplete', 'The @everyone overwrite permissions are unresolvable.'))
    } else if (!hasDiscordPermission(deny, 'VIEW_CHANNEL') || hasDiscordPermission(allow, 'VIEW_CHANNEL')) {
      findings.push(finding('everyone_view_deny', 'fail', 'The channel does not explicitly deny VIEW_CHANNEL to @everyone.'))
    } else {
      findings.push(finding('everyone_view_deny', 'pass', 'The channel explicitly denies VIEW_CHANNEL to @everyone.'))
    }
  }

  for (const overwrite of input.overwrites) {
    if (overwrite.type !== 0 || overwrite.id === input.guildId) continue
    const role = roles.get(overwrite.id)
    const allow = parseDiscordPermissionBits(overwrite.allow)
    const deny = parseDiscordPermissionBits(overwrite.deny)
    if (!role || allow === null || deny === null) {
      findings.push(finding('role_overwrites', 'incomplete', 'A channel role overwrite could not be resolved.'))
      continue
    }
    if (!hasDiscordPermission(allow, 'VIEW_CHANNEL')) continue
    exposedRoleOverwrites += 1
    if (!configuredRoleIds.has(overwrite.id) && overwrite.id !== input.botManagedRoleId) {
      const rolePermissions = parseDiscordPermissionBits(role.permissions)
      if (rolePermissions !== null && hasDiscordPermission(rolePermissions, 'ADMINISTRATOR')) {
        warnings.push('An unapproved role with Administrator access bypasses channel overwrites; review that Discord governance choice.')
        findings.push(finding('role_overwrites', 'warning', 'An unapproved role has Administrator access; its broad access is disclosed as a governance warning.'))
      } else {
        findings.push(finding('role_overwrites', 'fail', 'A non-approved role can view the private chat channel.'))
      }
    }
  }

  const directMemberAllows = input.overwrites.filter((overwrite) => {
    const allow = parseDiscordPermissionBits(overwrite.allow)
    return overwrite.type === 1 && allow !== null && hasDiscordPermission(allow, 'VIEW_CHANNEL')
  })
  const mappedIds = new Set(input.mappedMemberIds)
  for (const overwrite of directMemberAllows) {
    exposedMemberOverwrites += 1
    if (overwrite.id === input.botUserId) continue
    const member = input.membersById.get(overwrite.id)
    if (!member) {
      findings.push(finding('member_overwrites', 'incomplete', 'A direct member channel grant could not be resolved.'))
      continue
    }
    const effective = effectiveDiscordPermissions(member, input)
    if (effective.owner || effective.administrator) {
      warnings.push('A directly exposed guild owner/Administrator member is governed by Discord bypass rules.')
      continue
    }
    if (!mappedIds.has(overwrite.id) || !hasAnyConfiguredRole(member, configuredRoleIds)) {
      findings.push(finding('member_overwrites', 'fail', 'A direct member VIEW_CHANNEL grant is not tied to an approved mapped responder.'))
    }
  }

  if (!botMember) {
    findings.push(finding('bot_member', 'incomplete', 'The configured bot member could not be resolved.'))
  } else {
    const botEffective = effectiveDiscordPermissions(botMember, input)
    if (botEffective.missingRole) {
      findings.push(finding('bot_permissions', 'incomplete', 'The bot permission calculation used an unresolved role.'))
    } else if (botEffective.administrator) {
      warnings.push('The configured bot has Administrator or guild-owner access; required channel permissions are bypassed.')
      findings.push(finding('bot_permissions', 'warning', 'The bot has broad Discord access; review that governance choice.'))
    } else {
      const missing = DISCORD_BOT_REQUIRED_PERMISSIONS.filter((permission) => !hasDiscordPermission(botEffective.permissions, permission))
      if (missing.length > 0) {
        findings.push(finding('bot_permissions', 'fail', 'The bot is missing one or more required channel permissions.'))
      } else {
        findings.push(finding('bot_permissions', 'pass', 'The bot has the required channel permissions.'))
      }
    }
  }

  let mappedMembersChecked = 0
  for (const mappedId of mappedIds) {
    const member = input.membersById.get(mappedId)
    mappedMembersChecked += 1
    if (!member) {
      findings.push(finding('staff_members', 'incomplete', 'An active mapped staff member could not be resolved in the guild.'))
      continue
    }
    if (!hasAnyConfiguredRole(member, configuredRoleIds)) {
      findings.push(finding('staff_members', 'fail', 'An active mapped staff member lacks an approved responder role.'))
      continue
    }
    const effective = effectiveDiscordPermissions(member, input)
    if (effective.missingRole) {
      findings.push(finding('staff_permissions', 'incomplete', 'A mapped staff permission calculation used an unresolved role.'))
      continue
    }
    if (effective.administrator) {
      warnings.push('At least one mapped staff member has Administrator or guild-owner access; channel privacy is bypassed for that member.')
      findings.push(finding('staff_permissions', 'warning', 'A mapped staff member has broad Discord access; review that governance choice.'))
      continue
    }
    const missing = DISCORD_STAFF_REQUIRED_PERMISSIONS.filter((permission) => !hasDiscordPermission(effective.permissions, permission))
    if (missing.length > 0) {
      findings.push(finding('staff_permissions', 'fail', 'A mapped staff member cannot view channel history.'))
    }
  }

  return {
    status: overallStatus(findings),
    findings,
    warnings: [...new Set(warnings)],
    counts: { exposedRoleOverwrites, exposedMemberOverwrites, mappedMembersChecked },
  }
}
