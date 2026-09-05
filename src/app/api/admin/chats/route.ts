import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import {
  chatAdminConversationListSchema,
  chatAdminReplySchema,
} from '@/lib/chat-admin-contracts'
import {
  insertChatStaffReply,
  listChatConversationsForStaff,
} from '@/lib/chat-admin-repository'
import {
  chatAdminErrorResponse,
  invalidChatAdminRequest,
  readBoundedJson,
  scheduleStaffChatDelivery,
  strictQueryObject,
} from '@/lib/chat-admin-http'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const query = strictQueryObject(request)
  if (!query) return invalidChatAdminRequest()
  const parsed = chatAdminConversationListSchema.safeParse(query)
  if (!parsed.success) return invalidChatAdminRequest()
  try {
    return jsonNoStore(await listChatConversationsForStaff(parsed.data))
  } catch (error) {
    return chatAdminErrorResponse(error, 'Chat conversations are temporarily unavailable.')
  }
}

/** Browser dashboard reply endpoint; Discord-only actor/source fields are not accepted. */
export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = chatAdminReplySchema.safeParse(await readBoundedJson(request))
  if (!parsed.success) return invalidChatAdminRequest()
  try {
    const message = await insertChatStaffReply(parsed.data, auth.user.id)
    await scheduleStaffChatDelivery(message.conversationId)
    return jsonNoStore({ message }, 201)
  } catch (error) {
    return chatAdminErrorResponse(error, 'The chat reply could not be saved.')
  }
}
