import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { listChatMessagesForStaff } from '@/lib/chat-admin-repository'
import {
  chatAdminErrorResponse,
  invalidChatAdminRequest,
  strictQueryObject,
} from '@/lib/chat-admin-http'
import { jsonNoStore } from '@/lib/volunteer-api'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const query = strictQueryObject(request)
  if (!query || Object.keys(query).some((key) => key !== 'after' && key !== 'limit')) return invalidChatAdminRequest()
  const after = query.after ?? null
  const limitValue = query.limit ?? '50'
  if (!/^\d+$/u.test(limitValue)) return invalidChatAdminRequest()
  const limit = Number(limitValue)
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return invalidChatAdminRequest()
  const { id } = await params
  try {
    return jsonNoStore(await listChatMessagesForStaff(id, after, limit))
  } catch (error) {
    return chatAdminErrorResponse(error, 'The chat transcript is temporarily unavailable.')
  }
}
