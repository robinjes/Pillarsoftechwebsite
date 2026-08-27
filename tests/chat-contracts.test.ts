import { describe, expect, it } from 'vitest'

import {
  chatConversationCreateSchema,
  chatMessageCreateSchema,
  MAX_CHAT_MESSAGE,
} from '@/lib/chat-contracts'
import { decodeChatCursor, encodeChatCursor } from '@/lib/chat-pagination'

const conversationId = '00000000-0000-4000-8000-000000000001'

describe('chat input contracts', () => {
  it('requires a display name, permits optional email, and keeps the schema strict', () => {
    expect(chatConversationCreateSchema.safeParse({
      displayName: 'Ada Lovelace',
      isUnder13: false,
      guardianAttested: false,
      honeypot: '',
    }).success).toBe(true)
    expect(chatConversationCreateSchema.safeParse({
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      isUnder13: false,
      guardianAttested: false,
      honeypot: '',
    }).success).toBe(true)
    expect(chatConversationCreateSchema.safeParse({
      displayName: 'Ada Lovelace',
      email: '',
      isUnder13: false,
      guardianAttested: false,
      honeypot: '',
    }).success).toBe(true)
    expect(chatConversationCreateSchema.safeParse({
      displayName: 'Ada Lovelace',
      isUnder13: false,
      guardianAttested: false,
      honeypot: '',
      webhookUrl: 'https://evil.example',
    }).success).toBe(false)
  })

  it('requires explicit guardian attestation for under-13 visitors', () => {
    const base = { displayName: 'Young visitor', isUnder13: true, honeypot: '' }
    expect(chatConversationCreateSchema.safeParse({ ...base, guardianAttested: false }).success).toBe(false)
    expect(chatConversationCreateSchema.safeParse({ ...base, guardianAttested: true }).success).toBe(true)
  })

  it('allows normal punctuation but rejects markup, unsafe destinations, and oversize text', () => {
    const valid = { conversationId, body: "Can you help me plan a robot? It's for school! (Thank you.)", honeypot: '' }
    expect(chatMessageCreateSchema.safeParse(valid).success).toBe(true)
    expect(chatMessageCreateSchema.safeParse({ ...valid, body: '<script>alert(1)</script>' }).success).toBe(false)
    expect(chatMessageCreateSchema.safeParse({ ...valid, body: 'a'.repeat(MAX_CHAT_MESSAGE + 1) }).success).toBe(false)
    expect(chatMessageCreateSchema.safeParse({ ...valid, destination: 'javascript:alert(1)' }).success).toBe(false)
    expect(chatMessageCreateSchema.safeParse({ ...valid, channelId: '123' }).success).toBe(false)
  })

  it('keeps pagination cursors opaque and delimiter-safe', () => {
    const cursor = encodeChatCursor('2026-08-26T12:00:00.000Z', conversationId)
    expect(decodeChatCursor(cursor)).toEqual({ createdAt: '2026-08-26T12:00:00.000Z', id: conversationId })
    expect(decodeChatCursor(`${cursor}!`)).toBeNull()
    expect(decodeChatCursor(Buffer.from(JSON.stringify({
      createdAt: '2026-08-26T12:00:00Z,unexpected',
      id: conversationId,
    }), 'utf8').toString('base64url'))).toBeNull()
  })
})
