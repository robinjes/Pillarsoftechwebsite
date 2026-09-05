import { NextResponse } from 'next/server'

import { getChatServerConfig } from '@/lib/chat-config'
import {
  DISCORD_INTERACTION_MAX_BODY_BYTES,
  DISCORD_INTERACTION_REQUEST_DEADLINE_MS,
  parseDiscordInteractionBody,
  handleVerifiedDiscordInteraction,
  readBoundedRequestBytes,
  safeInteractionErrorResponse,
  verifyDiscordInteractionSignature,
  type DiscordInteractionDependencies,
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

async function postDiscordInteraction(
  request: Request,
  interactionDependencies: DiscordInteractionDependencies = {},
): Promise<NextResponse> {
  const deadlineAt = Date.now() + DISCORD_INTERACTION_REQUEST_DEADLINE_MS
  const config = interactionDependencies.config ?? getChatServerConfig()
  const rawBody = await readBoundedRequestBytes(request, DISCORD_INTERACTION_MAX_BODY_BYTES, deadlineAt)
  if (!rawBody) return failure(Date.now() >= deadlineAt ? 408 : 413, 'invalid_request')
  if (Date.now() >= deadlineAt) return failure(408, 'deadline')

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
  if (Date.now() >= deadlineAt) return failure(408, 'deadline')

  try {
    const handledResult = await handleInteractionWithinDeadline(payload, {
      ...interactionDependencies,
      config,
      deadlineAt,
    }, deadlineAt)
    if (!handledResult) return failure(408, 'deadline')
    const handled = handledResult
    if (Date.now() >= deadlineAt) return failure(408, 'deadline')
    // The interaction module uses Next's after() scheduler for deferred work.
    // Its callback is part of the request lifecycle; no detached promise is
    // created by this route.
    if (handled.work) await handled.work()
    return response(handled.response)
  } catch (error) {
    if (Date.now() >= deadlineAt) return failure(408, 'deadline')
    return response(safeInteractionErrorResponse(error))
  }
}

async function handleInteractionWithinDeadline(
  payload: Record<string, unknown>,
  dependencies: DiscordInteractionDependencies,
  deadlineAt: number,
): Promise<Awaited<ReturnType<typeof handleVerifiedDiscordInteraction>> | null> {
  const remainingMs = deadlineAt - Date.now()
  if (remainingMs <= 0) return null
  type Result =
    | { timedOut: true }
    | { timedOut: false; value: Awaited<ReturnType<typeof handleVerifiedDiscordInteraction>> }
    | { timedOut: false; error: unknown }
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<Result>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), remainingMs)
  })
  const handler = handleVerifiedDiscordInteraction(payload, dependencies)
    .then((value): Result => ({ timedOut: false, value }))
    .catch((error: unknown): Result => ({ timedOut: false, error }))
  try {
    const result = await Promise.race([handler, timeout])
    if (result.timedOut) return null
    if ('error' in result) throw result.error
    return result.value
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return postDiscordInteraction(request)
}
