import { z } from 'zod'

import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { dispatchChatDeliveryBatch } from '@/lib/chat-discord-delivery'
import {
  chatAdminErrorResponse,
  invalidChatAdminRequest,
  readBoundedJson,
} from '@/lib/chat-admin-http'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const bodySchema = z.object({
  limit: z.number().int().min(1).max(25).default(25),
}).strict()

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = bodySchema.safeParse(await readBoundedJson(request))
  if (!parsed.success) return invalidChatAdminRequest()
  try {
    return jsonNoStore({ dispatch: await dispatchChatDeliveryBatch(parsed.data.limit) })
  } catch (error) {
    return chatAdminErrorResponse(error, 'Chat delivery dispatch is temporarily unavailable.')
  }
}
