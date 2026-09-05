import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export { sameOrigin, sameOriginFailure }

export function chatError(error: string, status: number) {
  return jsonNoStore({ error }, status)
}

export const CHAT_GENERIC_UNAVAILABLE = 'chat_unavailable'

/** Convert repository failures to the small public error vocabulary. */
export function chatRepositoryFailure(error: unknown) {
  const code = error && typeof error === 'object' && 'routeCode' in error
    ? String((error as { routeCode?: unknown }).routeCode ?? '')
    : ''
  if (code === 'chat_closed') return chatError('chat_closed', 409)
  if (code === 'conversation_not_found') return chatError('conversation_not_found', 404)
  if (code === 'under_13_requires_guardian') return chatError('under_13_requires_guardian', 403)
  if (code === 'message_id_conflict') return chatError('message_id_conflict', 409)
  const status = error && typeof error === 'object' && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : NaN
  if (status === 409) return chatError('chat_closed', 409)
  if (status === 404) return chatError('conversation_not_found', 404)
  return chatError(CHAT_GENERIC_UNAVAILABLE, 503)
}
