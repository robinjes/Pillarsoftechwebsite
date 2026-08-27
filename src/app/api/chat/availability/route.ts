import { getStoredChatAvailability } from '@/lib/chat-repository'
import { chatError } from '@/lib/chat-route'
import { jsonNoStore } from '@/lib/volunteer-api'

export async function GET() {
  try {
    return jsonNoStore(await getStoredChatAvailability())
  } catch {
    return chatError('chat_unavailable', 503)
  }
}

