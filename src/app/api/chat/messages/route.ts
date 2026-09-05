import { readJson } from '@/lib/admin-api'
import { after } from 'next/server'
import type { NextResponse } from 'next/server'
import { chatMessageCreateSchema } from '@/lib/chat-contracts'
import { decodeChatCursor } from '@/lib/chat-pagination'
import {
  getStoredChatAvailability,
  getChatConversationForVisitor,
  getChatMessageForVisitor,
  insertChatMessageForVisitor,
  listChatMessagesForVisitor,
} from '@/lib/chat-repository'
import { chatError, chatRepositoryFailure, sameOrigin, sameOriginFailure } from '@/lib/chat-route'
import { consumeChatRateLimit } from '@/lib/contact-rate-limit'
import { getChatTokenFromRequest, hashChatToken } from '@/lib/chat-token'
import { getRequestIdentity } from '@/lib/request-identity'
import { jsonNoStore } from '@/lib/volunteer-api'
import { deliverChatConversation } from '@/lib/chat-discord-delivery'

const pageSizePattern = /^\d+$/

/** Schedule only after the database has accepted the visitor message. */
function scheduleChatDelivery(conversationId: string): void {
  try {
    after(() => deliverChatConversation(conversationId).then(() => undefined).catch(() => undefined))
  } catch {
    // Unit callers and non-Next contexts do not have an after() request store.
    // The durable pending row remains available to staff dispatch/retry.
  }
}

function queryValue(request: Request, key: string): string | undefined | null {
  const params = new URL(request.url).searchParams
  const values = params.getAll(key)
  return values.length === 1 ? values[0] : values.length === 0 ? undefined : null
}

function parseMessageQuery(request: Request): { cursor: ReturnType<typeof decodeChatCursor>; limit: number } | null {
  const params = new URL(request.url).searchParams
  for (const key of params.keys()) if (key !== 'after' && key !== 'limit') return null
  const after = queryValue(request, 'after')
  const limitValue = queryValue(request, 'limit')
  if (after === null || limitValue === null) return null
  const cursor = after === undefined ? null : decodeChatCursor(after)
  if (after !== undefined && !cursor) return null
  const limit = limitValue === undefined ? 50 : Number(limitValue)
  if (!pageSizePattern.test(limitValue ?? '50') || !Number.isInteger(limit) || limit < 1 || limit > 50) return null
  return { cursor, limit }
}

async function ownerFromRequest(request: Request, conversationId?: string) {
  const token = getChatTokenFromRequest(request)
  if (!token) return { error: chatError('ownership_required', 401) } as const
  let digest: string
  try {
    digest = hashChatToken(token)
  } catch {
    return { error: chatError('chat_unavailable', 503) } as const
  }
  try {
    const conversation = await getChatConversationForVisitor(digest, conversationId)
    if (!conversation || (conversationId !== undefined && conversation.id !== conversationId)) {
      return { error: chatError('conversation_not_found', 404) } as const
    }
    return { digest, conversation } as const
  } catch (error) {
    return { error: chatRepositoryFailure(error) } as const
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const query = parseMessageQuery(request)
  if (!query) return chatError('invalid_chat_cursor', 400)
  const owner = await ownerFromRequest(request)
  if ('error' in owner) return owner.error ?? chatError('chat_unavailable', 503)
  if (owner.conversation.status === 'spam') return chatError('conversation_not_found', 404)

  try {
    const result = await listChatMessagesForVisitor(owner.conversation, owner.digest, query.cursor, query.limit)
    return jsonNoStore({
      ...result,
      conversation: { id: owner.conversation.id, status: owner.conversation.status },
      conversationStatus: owner.conversation.status,
    })
  } catch (error) {
    return chatRepositoryFailure(error)
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = chatMessageCreateSchema.safeParse(await readJson(request))
  if (!parsed.success) return chatError('invalid_chat_request', 400)

  const owner = await ownerFromRequest(request, parsed.data.conversationId)
  if ('error' in owner) return owner.error ?? chatError('chat_unavailable', 503)

  // An exact retry should be safe to acknowledge even when the queue closed
  // after the original insert. The lookup is still bound to the opaque owner
  // and conversation, and conflicting bodies fail before any new write.
  try {
    const existing = await getChatMessageForVisitor(
      owner.conversation,
      owner.digest,
      parsed.data.clientMessageId,
      parsed.data.body,
    )
    if (existing) {
      scheduleChatDelivery(existing.conversationId)
      return jsonNoStore({ message: existing, replayed: true }, 200)
    }
  } catch (error) {
    return chatRepositoryFailure(error)
  }

  let availability
  try {
    availability = await getStoredChatAvailability()
  } catch {
    return chatError('chat_unavailable', 503)
  }
  if (availability.state !== 'open' || !availability.queueOpen) return chatError('chat_closed', 409)

  if (owner.conversation.status !== 'open') return chatError('chat_closed', 409)

  try {
    const identity = `${getRequestIdentity(request)}:${owner.conversation.id}`
    if (!await consumeChatRateLimit('chat-message', identity, { windowSeconds: 600, maxAttempts: 20 })) {
      return chatError('rate_limited', 429)
    }
  } catch {
    return chatError('chat_unavailable', 503)
  }

  try {
    const message = await insertChatMessageForVisitor(
      owner.conversation,
      owner.digest,
      parsed.data.body,
      parsed.data.clientMessageId,
    )
    scheduleChatDelivery(message.conversationId)
    return jsonNoStore({ message }, 201)
  } catch (error) {
    return chatRepositoryFailure(error)
  }
}
