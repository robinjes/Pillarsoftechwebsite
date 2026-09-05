import { z } from 'zod'

import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { deliverChatConversation } from '@/lib/chat-discord-delivery'
import {
  chatAdminErrorResponse,
  invalidChatAdminRequest,
  readBoundedJson,
} from '@/lib/chat-admin-http'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const conversationIdSchema = z.uuid()
const bodySchema = z.object({
  actionId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/u).optional(),
}).strict()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const { id } = await params
  if (!conversationIdSchema.safeParse(id).success) return invalidChatAdminRequest()
  const body = bodySchema.safeParse(await readBoundedJson(request))
  if (!body.success) return invalidChatAdminRequest()
  try {
    const work = async () => {
      try { await deliverChatConversation(id) } catch { /* durable delivery state remains retryable */ }
    }
    // Explicit retry is a POST side effect. Track it in Next's lifecycle when
    // available; unit callers await the bounded delivery instead.
    try {
      const { after } = await import('next/server')
      after(work)
    } catch {
      await work()
    }
    return jsonNoStore({ queued: true }, 202)
  } catch (error) {
    return chatAdminErrorResponse(error, 'The chat retry could not be queued.')
  }
}
