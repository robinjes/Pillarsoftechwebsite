import { z } from 'zod'

import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { chatAdminReplySchema } from '@/lib/chat-admin-contracts'
import { insertChatStaffReply } from '@/lib/chat-admin-repository'
import {
  chatAdminErrorResponse,
  invalidChatAdminRequest,
  readBoundedJson,
  scheduleStaffChatDelivery,
} from '@/lib/chat-admin-http'
import { isPlainChatText, MAX_CHAT_MESSAGE } from '@/lib/chat-contracts'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const bodySchema = z.object({
  staffMessageId: z.uuid(),
  body: z.string().trim().min(1).max(MAX_CHAT_MESSAGE).refine(isPlainChatText),
}).strict()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const { id } = await params
  const body = bodySchema.safeParse(await readBoundedJson(request))
  if (!body.success) return invalidChatAdminRequest()
  const input = chatAdminReplySchema.safeParse({ conversationId: id, ...body.data })
  if (!input.success) return invalidChatAdminRequest()
  try {
    const message = await insertChatStaffReply(input.data, auth.user.id)
    await scheduleStaffChatDelivery(message.conversationId)
    return jsonNoStore({ message }, 201)
  } catch (error) {
    return chatAdminErrorResponse(error, 'The chat reply could not be saved.')
  }
}
