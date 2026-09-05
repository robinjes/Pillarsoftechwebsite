import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { getChatServerConfig } from '@/lib/chat-config'
import { chatAdminQueueUpdateSchema } from '@/lib/chat-admin-contracts'
import {
  chatAdminErrorResponse,
  invalidChatAdminRequest,
  readBoundedJson,
} from '@/lib/chat-admin-http'
import {
  getChatQueueStateForStaff,
  setChatQueueStateForStaff,
} from '@/lib/chat-admin-repository'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function GET() {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  try {
    return jsonNoStore({ queue: await getChatQueueStateForStaff() })
  } catch (error) {
    return chatAdminErrorResponse(error, 'The chat queue is temporarily unavailable.')
  }
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = chatAdminQueueUpdateSchema.safeParse(await readBoundedJson(request))
  if (!parsed.success) return invalidChatAdminRequest()
  if (parsed.data.queueOpen && !getChatServerConfig().ready) {
    return jsonNoStore({ error: 'chat_not_configured' }, 409)
  }
  try {
    return jsonNoStore({ queue: await setChatQueueStateForStaff(parsed.data, auth.user.id) })
  } catch (error) {
    return chatAdminErrorResponse(error, 'The chat queue could not be changed.')
  }
}
