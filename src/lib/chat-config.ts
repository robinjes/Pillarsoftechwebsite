import 'server-only'

import { getSupabaseServiceConfig } from '@/lib/supabase/config'

/**
 * Server-only chat configuration. The public site must remain dark unless
 * the explicit feature flag is enabled and every Discord trust boundary is
 * configured. Keeping this read in one module prevents individual routes or
 * the future bridge from accidentally treating a partial environment as live.
 */

export const CHAT_ENABLED_ENV = 'CHAT_ENABLED'

export const CHAT_DISCORD_ENV_NAMES = {
  applicationId: 'DISCORD_APPLICATION_ID',
  publicKey: 'DISCORD_PUBLIC_KEY',
  botToken: 'DISCORD_BOT_TOKEN',
  guildId: 'DISCORD_GUILD_ID',
  channelId: 'DISCORD_CHAT_CHANNEL_ID',
  staffRoleIds: 'DISCORD_CHAT_STAFF_ROLE_IDS',
} as const

/** Vercel's standard bearer secret for the protected retention cron. */
export const CHAT_RETENTION_SECRET_ENV = 'CRON_SECRET'

export type ChatServerConfigurationStatus = 'disabled' | 'incomplete' | 'ready'

export interface ChatServerConfig {
  enabled: boolean
  ready: boolean
  /** All server-side prerequisites, independent of the public feature flag. */
  credentialReady: boolean
  /** Discord bot and fixed guild/channel coordinates are usable for delivery. */
  discordDeliveryReady: boolean
  /** The protected retention endpoint can authenticate its scheduled caller. */
  retentionReady: boolean
  status: ChatServerConfigurationStatus
  discordApplicationId: string | null
  discordPublicKey: string | null
  discordBotToken: string | null
  discordGuildId: string | null
  discordChannelId: string | null
  discordStaffRoleIds: string[]
}

const discordSnowflake = /^\d{1,30}$/u
const discordPublicKey = /^[0-9a-f]{64}$/iu

const retentionSecretMinLength = 32

function env(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return null
}

function enabledFlag(): boolean {
  return process.env[CHAT_ENABLED_ENV]?.trim().toLowerCase() === 'true'
}

function validSnowflake(value: string | null): value is string {
  return value !== null && discordSnowflake.test(value)
}

function validPublicKey(value: string | null): value is string {
  return value !== null && discordPublicKey.test(value)
}

function validRetentionSecret(value: string | null): value is string {
  return value !== null && value.length >= retentionSecretMinLength && !/\s/u.test(value)
}

function roleIds(value: string | null): string[] {
  if (!value) return []
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

/**
 * Read the complete server configuration without logging or returning a
 * partially usable secret. The returned fields are for server modules only;
 * API routes must never serialize this object.
 */
export function getChatServerConfig(): ChatServerConfig {
  const enabled = enabledFlag()
  const values = {
    discordApplicationId: env(CHAT_DISCORD_ENV_NAMES.applicationId),
    discordPublicKey: env(CHAT_DISCORD_ENV_NAMES.publicKey),
    discordBotToken: env(CHAT_DISCORD_ENV_NAMES.botToken),
    discordGuildId: env(CHAT_DISCORD_ENV_NAMES.guildId),
    discordChannelId: env(CHAT_DISCORD_ENV_NAMES.channelId),
    discordStaffRoleIds: roleIds(env(CHAT_DISCORD_ENV_NAMES.staffRoleIds)),
  }
  const retentionSecret = env(CHAT_RETENTION_SECRET_ENV)
  const discordDeliveryReady = values.discordBotToken !== null
    && validSnowflake(values.discordGuildId)
    && validSnowflake(values.discordChannelId)
  const credentialReady = getSupabaseServiceConfig() !== null
    && Boolean(process.env.CHAT_TOKEN_PEPPER?.trim())
    && validSnowflake(values.discordApplicationId)
    && validPublicKey(values.discordPublicKey)
    && discordDeliveryReady
    && values.discordStaffRoleIds.length > 0
    && values.discordStaffRoleIds.every(validSnowflake)
  const retentionReady = validRetentionSecret(retentionSecret)
  const ready = enabled && credentialReady && retentionReady

  return {
    enabled,
    ready,
    credentialReady,
    discordDeliveryReady,
    retentionReady,
    status: !enabled ? 'disabled' : ready ? 'ready' : 'incomplete',
    ...values,
  }
}

/** Read the cron secret only inside server-side route/runner code. */
export function getChatRetentionSecret(): string | null {
  const value = env(CHAT_RETENTION_SECRET_ENV)
  return validRetentionSecret(value) ? value : null
}

export function isChatLiveConfigured(): boolean {
  return getChatServerConfig().ready
}

/** Stable public-facing fallback used when chat is disabled or incomplete. */
export function isChatDisabledByConfiguration(): boolean {
  return !getChatServerConfig().ready
}
