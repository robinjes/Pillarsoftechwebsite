import { readJson } from '@/lib/admin-api'
import { chatConversationCreateSchema } from '@/lib/chat-contracts'
import { getStoredChatAvailability, createChatConversation, getChatConversationForVisitor } from '@/lib/chat-repository'
import { chatError, sameOrigin, sameOriginFailure } from '@/lib/chat-route'
import { consumeChatRateLimit } from '@/lib/contact-rate-limit'
import { generateChatToken, getChatTokenFromRequest, hashChatToken, setChatTokenCookie } from '@/lib/chat-token'
import { getRequestIdentity } from '@/lib/request-identity'
import { jsonNoStore } from '@/lib/volunteer-api'

function publicConversation(conversation: { id: string; status: string; ownershipExpiresAt: string }, resumed: boolean) {
  return {
    id: conversation.id,
    status: conversation.status,
    ownershipExpiresAt: conversation.ownershipExpiresAt,
    resumed,
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = chatConversationCreateSchema.safeParse(await readJson(request))
  if (!parsed.success) return chatError('invalid_chat_request', 400)

  let availability
  try {
    availability = await getStoredChatAvailability()
  } catch {
    return chatError('chat_unavailable', 503)
  }
  if (availability.state !== 'open' || !availability.queueOpen) return chatError('chat_closed', 409)

  let token = getChatTokenFromRequest(request)
  let digest: string
  try {
    token = token ?? generateChatToken()
    digest = hashChatToken(token)

    // A cookie with no active, unexpired owner is replaced before creating a
    // new row. This prevents an expired/foreign cookie from retaining any
    // authority while still allowing a valid browser to resume its chat.
    if (getChatTokenFromRequest(request)) {
      const existing = await getChatConversationForVisitor(digest)
      if (!existing || existing.status !== 'open') {
        token = generateChatToken()
        digest = hashChatToken(token)
      }
    }
  } catch {
    return chatError('chat_unavailable', 503)
  }

  try {
    if (!await consumeChatRateLimit('chat-conversation', getRequestIdentity(request), { windowSeconds: 600, maxAttempts: 5 })) {
      return chatError('rate_limited', 429)
    }
  } catch {
    return chatError('chat_unavailable', 503)
  }

  try {
    const result = await createChatConversation(parsed.data, digest)
    const response = jsonNoStore({ conversation: publicConversation(result.conversation, result.resumed) }, result.resumed ? 200 : 201)
    setChatTokenCookie(response, token)
    return response
  } catch {
    return chatError('chat_unavailable', 503)
  }
}
