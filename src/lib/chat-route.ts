import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export { sameOrigin, sameOriginFailure }

export function chatError(error: string, status: number) {
  return jsonNoStore({ error }, status)
}

export const CHAT_GENERIC_UNAVAILABLE = 'chat_unavailable'

