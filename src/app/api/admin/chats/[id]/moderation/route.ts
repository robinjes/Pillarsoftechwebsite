import { z } from 'zod'

import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { chatAdminTerminalSchema } from '@/lib/chat-admin-contracts'
import { setChatConversationTerminal } from '@/lib/chat-admin-repository'
import {
  chatAdminErrorResponse,
  invalidChatAdminRequest,
  readBoundedJson,
} from '@/lib/chat-admin-http'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const bodySchema = z.object({
  status: z.enum(['closed', 'spam']),
  actionId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/u),
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
  const input = chatAdminTerminalSchema.safeParse({ conversationId: id, ...body.data })
  if (!input.success) return invalidChatAdminRequest()
  try {
    return jsonNoStore({ conversation: await setChatConversationTerminal(input.data, auth.user.id) })
  } catch (error) {
    return chatAdminErrorResponse(error, 'The chat moderation action could not be completed.')
  }
}
