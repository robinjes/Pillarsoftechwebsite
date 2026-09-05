import { NextResponse } from 'next/server'

import { getChatServerConfig } from '@/lib/chat-config'
import {
  DISCORD_INTERACTION_MAX_BODY_BYTES,
  parseDiscordInteractionBody,
  handleVerifiedDiscordInteraction,
  readBoundedRequestBytes,
  safeInteractionErrorResponse,
  verifyDiscordInteractionSignature,
  type DiscordInteractionResponse,
} from '@/lib/chat-discord-interactions'

export const runtime = 'nodejs'

function response(body: DiscordInteractionResponse, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

function failure(status: number, code: string): NextResponse {
  return response({
    type: 4,
    data: {
      content: code === 'stale_signature' ? 'This interaction has expired.' : 'This interaction is unavailable.',
      flags: 1 << 6,
      allowed_mentions: { parse: [] },
    },
  }, status)
}

export async function POST(request: Request): Promise<NextResponse> {
  const config = getChatServerConfig()
  const rawBody = await readBoundedRequestBytes(request, DISCORD_INTERACTION_MAX_BODY_BYTES)
  if (!rawBody) return failure(413, 'invalid_request')

  const signature = verifyDiscordInteractionSignature(
    rawBody,
    request.headers.get('x-signature-ed25519'),
    request.headers.get('x-signature-timestamp'),
    config.discordPublicKey,
  )
  if (signature === 'stale') return failure(401, 'stale_signature')
  if (signature !== 'valid') return failure(401, 'invalid_signature')

  // This parse intentionally follows signature verification.  An attacker can
  // never use malformed JSON to reach authorization or storage code.
  const payload = parseDiscordInteractionBody(rawBody)
  if (!payload) return failure(400, 'invalid_request')

  try {
    const handled = await handleVerifiedDiscordInteraction(payload)
    // The interaction module uses Next's after() scheduler for deferred work.
    // Its callback is part of the request lifecycle; no detached promise is
    // created by this route.
    if (handled.work) await handled.work()
    return response(handled.response)
  } catch (error) {
    return response(safeInteractionErrorResponse(error))
  }
}
