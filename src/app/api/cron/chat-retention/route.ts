import { NextResponse } from 'next/server'

import { getChatServerConfig } from '@/lib/chat-config'
import {
  authorizeChatRetentionRequest,
  CHAT_RETENTION_DISCORD_TIMEOUT_MS,
  createRetentionDiscordClient,
  runChatRetention,
} from '@/lib/chat-retention'

export const runtime = 'nodejs'
/** Keep a margin below the platform's maximum for the durable next run. */
export const maxDuration = 60

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

async function run(request: Request): Promise<NextResponse> {
  const authorization = authorizeChatRetentionRequest(request)
  if (authorization === 'missing_secret') {
    return json({ error: 'configuration_unavailable' }, 503)
  }
  if (authorization !== 'authorized') return json({ error: 'unauthorized' }, 401)

  const config = getChatServerConfig()
  if (!config.discordGuildId || !config.discordChannelId) {
    return json({ error: 'configuration_unavailable' }, 503)
  }

  // Retention is deliberately independent from CHAT_ENABLED. When the bot
  // credentials are absent, the runner still prepares website deletion rows;
  // cleanupDiscordChatJob records a retryable failure without making a call.
  let client: ReturnType<typeof createRetentionDiscordClient> | undefined
  if (config.discordDeliveryReady) {
    try {
      client = createRetentionDiscordClient(config)
    } catch {
      // The runner will record a retryable cleanup failure if the bot
      // identity is incomplete; do not turn that durable state into a 500.
      client = undefined
    }
  }
  const result = await runChatRetention({
    config,
    ...(client ? { client } : {}),
    maxRuntimeMs: maxDuration * 1_000 - CHAT_RETENTION_DISCORD_TIMEOUT_MS,
  })
  if (result.errorCode) return json({ error: result.errorCode }, 503)
  return json({ ok: true, ...result })
}

export async function GET(request: Request): Promise<NextResponse> {
  return run(request)
}

export async function POST(request: Request): Promise<NextResponse> {
  return run(request)
}
