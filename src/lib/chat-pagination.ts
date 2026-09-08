import { chatCursorPayloadSchema, type ChatCursorPayload } from '@/lib/chat-contracts'

export const CHAT_CURSOR_MAX_LENGTH = 256

/** Encode only the indexed keyset values. The browser treats this as opaque. */
export function encodeChatCursor(createdAt: string, id: string): string {
  const parsed = chatCursorPayloadSchema.safeParse({ createdAt, id })
  if (!parsed.success) throw new Error('Invalid chat cursor values.')
  return Buffer.from(JSON.stringify(parsed.data), 'utf8').toString('base64url')
}

/** Reject malformed/canonicality-breaking base64 before decoding the payload. */
export function decodeChatCursor(value: unknown): ChatCursorPayload | null {
  if (typeof value !== 'string' || value.length < 1 || value.length > CHAT_CURSOR_MAX_LENGTH) return null
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8')
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== value) return null
    const parsed = chatCursorPayloadSchema.safeParse(JSON.parse(decoded))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

