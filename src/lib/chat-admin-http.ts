import 'server-only'

import { after } from 'next/server'
import { NextResponse } from 'next/server'

import { ChatAdminRepositoryError } from '@/lib/chat-admin-repository'
import { deliverChatConversation } from '@/lib/chat-discord-delivery'
import { readBoundedRequestBytes } from '@/lib/chat-discord-interactions'
import { jsonNoStore } from '@/lib/volunteer-api'

export const CHAT_ADMIN_MAX_BODY_BYTES = 64 * 1024

/** Parse a bounded JSON body without exposing parser/database detail. */
export async function readBoundedJson(request: Request): Promise<unknown> {
  const bytes = await readBoundedRequestBytes(request, CHAT_ADMIN_MAX_BODY_BYTES)
  if (!bytes) return null
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown
  } catch {
    return null
  }
}

/** Reject duplicate query keys before a strict Zod object sees them. */
export function strictQueryObject(request: Request): Record<string, string> | null {
  const result: Record<string, string> = Object.create(null) as Record<string, string>
  for (const [key, value] of new URL(request.url).searchParams.entries()) {
    // Zod intentionally ignores this legacy prototype name while parsing an
    // object. Reject it at the transport boundary so it cannot evade a strict
    // query schema or become a prototype-pollution input later.
    if (key === '__proto__') return null
    if (Object.prototype.hasOwnProperty.call(result, key)) return null
    result[key] = value
  }
  return result
}

export function chatAdminErrorResponse(error: unknown, fallback = 'Chat administration is temporarily unavailable.') {
  void fallback
  if (error instanceof ChatAdminRepositoryError) {
    const routeCode = error.routeCode
    if (routeCode === 'invalid_request') return jsonNoStore({ error: 'invalid_request' }, 400)
    if (routeCode === 'conversation_not_found' || routeCode === 'message_not_found') return jsonNoStore({ error: 'not_found' }, 404)
    if (routeCode === 'chat_conflict' || routeCode === 'delivery_lease_unavailable') return jsonNoStore({ error: 'conflict' }, 409)
    if (routeCode === 'staff_authorization_unavailable') return jsonNoStore({ error: 'authorization_unavailable' }, 503)
  }
  return jsonNoStore({ error: 'service_unavailable' }, 503)
}

/**
 * Schedule staff-reply delivery in Next's lifecycle.  The fallback is only
 * used by unit callers outside a request context and is awaited deliberately.
 */
export async function scheduleStaffChatDelivery(conversationId: string): Promise<void> {
  const work = async () => {
    try { await deliverChatConversation(conversationId) } catch { /* durable retry state remains */ }
  }
  try {
    after(work)
  } catch {
    await work()
  }
}

export function invalidChatAdminRequest(): NextResponse {
  return jsonNoStore({ error: 'invalid_request' }, 400)
}
