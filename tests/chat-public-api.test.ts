import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getStoredChatAvailabilityMock,
  createChatConversationMock,
  getChatConversationForVisitorMock,
  listChatMessagesForVisitorMock,
  insertChatMessageForVisitorMock,
  consumeChatRateLimitMock,
} = vi.hoisted(() => ({
  getStoredChatAvailabilityMock: vi.fn(),
  createChatConversationMock: vi.fn(),
  getChatConversationForVisitorMock: vi.fn(),
  listChatMessagesForVisitorMock: vi.fn(),
  insertChatMessageForVisitorMock: vi.fn(),
  consumeChatRateLimitMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/chat-repository', () => ({
  getStoredChatAvailability: getStoredChatAvailabilityMock,
  createChatConversation: createChatConversationMock,
  getChatConversationForVisitor: getChatConversationForVisitorMock,
  listChatMessagesForVisitor: listChatMessagesForVisitorMock,
  insertChatMessageForVisitor: insertChatMessageForVisitorMock,
}))
vi.mock('@/lib/contact-rate-limit', () => ({ consumeChatRateLimit: consumeChatRateLimitMock }))

import { GET as getAvailability } from '@/app/api/chat/availability/route'
import { POST as postConversation } from '@/app/api/chat/conversations/route'
import { GET as getMessages, POST as postMessage } from '@/app/api/chat/messages/route'
import { CHAT_TOKEN_COOKIE, generateChatToken } from '@/lib/chat-token'

const conversationId = '00000000-0000-4000-8000-000000000001'
const visitorMessageId = '00000000-0000-4000-8000-000000000002'
const token = generateChatToken()
const activeConversation = {
  id: conversationId,
  status: 'open' as const,
  ownershipExpiresAt: '2026-09-25T12:00:00.000Z',
}

function jsonRequest(url: string, body: unknown, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    method: init.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: JSON.stringify(body),
  })
}

const validConversationBody = {
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  isUnder13: false,
  guardianAttested: false,
  honeypot: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CHAT_TOKEN_PEPPER', 'test-pepper')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://pillarsoftech.org')
  getStoredChatAvailabilityMock.mockResolvedValue({
    state: 'open',
    queueOpen: true,
    timezone: 'America/Los_Angeles',
    nextOpening: null,
  })
  createChatConversationMock.mockResolvedValue({ conversation: activeConversation })
  getChatConversationForVisitorMock.mockResolvedValue(activeConversation)
  listChatMessagesForVisitorMock.mockResolvedValue({ messages: [], nextCursor: null })
  insertChatMessageForVisitorMock.mockResolvedValue({
    id: visitorMessageId,
    conversationId,
    body: 'A question?',
    sender: 'visitor',
    deliveryStatus: 'pending',
    createdAt: '2026-08-26T12:00:00.000Z',
  })
  consumeChatRateLimitMock.mockResolvedValue(true)
})

describe('public visitor chat APIs', () => {
  it('returns no-store availability and never reports open when queue is closed', async () => {
    getStoredChatAvailabilityMock.mockResolvedValueOnce({
      state: 'scheduled_offline',
      queueOpen: false,
      timezone: 'America/Los_Angeles',
      nextOpening: '2026-08-27T23:00:00.000Z',
    })
    const response = await getAvailability()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    await expect(response.json()).resolves.toMatchObject({ state: 'scheduled_offline', queueOpen: false })
  })

  it('checks same-origin before parsing an unsafe conversation body', async () => {
    const response = await postConversation(new Request('https://pillarsoftech.org/api/chat/conversations', {
      method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: 'not-json',
    }))
    expect(response.status).toBe(403)
    expect(getStoredChatAvailabilityMock).not.toHaveBeenCalled()
    expect(consumeChatRateLimitMock).not.toHaveBeenCalled()
    expect(createChatConversationMock).not.toHaveBeenCalled()
  })

  it('rejects a honeypot before consuming the durable limiter', async () => {
    const response = await postConversation(jsonRequest('https://pillarsoftech.org/api/chat/conversations', {
      ...validConversationBody,
      honeypot: 'bot',
    }, { headers: { Origin: 'https://pillarsoftech.org' } }))
    expect(response.status).toBe(400)
    expect(consumeChatRateLimitMock).not.toHaveBeenCalled()
    expect(createChatConversationMock).not.toHaveBeenCalled()
  })

  it('gates creation on actual availability before limiting', async () => {
    getStoredChatAvailabilityMock.mockResolvedValueOnce({
      state: 'closed',
      queueOpen: true,
      timezone: 'America/Los_Angeles',
      nextOpening: '2026-08-27T23:00:00.000Z',
    })
    const response = await postConversation(jsonRequest('https://pillarsoftech.org/api/chat/conversations', validConversationBody))
    expect(response.status).toBe(409)
    expect(consumeChatRateLimitMock).not.toHaveBeenCalled()
    expect(createChatConversationMock).not.toHaveBeenCalled()
  })

  it('fails closed with a redacted response on limiter failure or denial', async () => {
    consumeChatRateLimitMock.mockRejectedValueOnce(new Error('database password and visitor email'))
    const failed = await postConversation(jsonRequest('https://pillarsoftech.org/api/chat/conversations', validConversationBody))
    expect(failed.status).toBe(503)
    await expect(failed.json()).resolves.toEqual({ error: 'chat_unavailable' })

    consumeChatRateLimitMock.mockResolvedValueOnce(false)
    const denied = await postConversation(jsonRequest('https://pillarsoftech.org/api/chat/conversations', validConversationBody))
    expect(denied.status).toBe(429)
    await expect(denied.json()).resolves.toEqual({ error: 'rate_limited' })
  })

  it('creates a conversation with an opaque secure ownership cookie', async () => {
    const response = await postConversation(jsonRequest('https://pillarsoftech.org/api/chat/conversations', validConversationBody))
    expect(response.status).toBe(201)
    expect(createChatConversationMock).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Ada Lovelace', email: 'ada@example.com' }), expect.stringMatching(/^[0-9a-f]{64}$/))
    const cookie = response.headers.get('set-cookie') ?? ''
    expect(cookie).toContain(`${CHAT_TOKEN_COOKIE}=`)
    expect(cookie).toContain('Secure')
    expect(cookie).not.toContain('Ada Lovelace')
    expect(cookie).not.toContain('ada@example.com')
  })

  it('redacts repository failures instead of returning names, emails, or transcript text', async () => {
    createChatConversationMock.mockRejectedValueOnce(new Error('visitor email and transcript body'))
    const response = await postConversation(jsonRequest('https://pillarsoftech.org/api/chat/conversations', validConversationBody))
    expect(response.status).toBe(503)
    const body = await response.text()
    expect(body).toBe('{"error":"chat_unavailable"}')
    expect(body).not.toContain('visitor email')
    expect(body).not.toContain('transcript body')
  })

  it('rejects malformed cursors before creating a repository read', async () => {
    const response = await getMessages(new Request('https://pillarsoftech.org/api/chat/messages?after=not-a-cursor', {
      headers: { cookie: `${CHAT_TOKEN_COOKIE}=${token}` },
    }))
    expect(response.status).toBe(400)
    expect(listChatMessagesForVisitorMock).not.toHaveBeenCalled()
  })

  it('requires a valid cookie and isolates message reads/writes to the owning conversation', async () => {
    const missing = await getMessages(new Request('https://pillarsoftech.org/api/chat/messages'))
    expect(missing.status).toBe(401)
    expect(listChatMessagesForVisitorMock).not.toHaveBeenCalled()

    const foreign = await postMessage(jsonRequest('https://pillarsoftech.org/api/chat/messages', {
      conversationId: '00000000-0000-4000-8000-000000000099',
      body: 'A question?',
      honeypot: '',
    }, { headers: { cookie: `${CHAT_TOKEN_COOKIE}=${token}` } }))
    expect(foreign.status).toBe(404)
    expect(insertChatMessageForVisitorMock).not.toHaveBeenCalled()
  })

  it('blocks sends to closed or spam conversations and persists active visitor messages', async () => {
    getChatConversationForVisitorMock.mockResolvedValueOnce({ ...activeConversation, status: 'closed' })
    const closed = await postMessage(jsonRequest('https://pillarsoftech.org/api/chat/messages', {
      conversationId,
      body: 'Can I follow up?',
      honeypot: '',
    }, { headers: { cookie: `${CHAT_TOKEN_COOKIE}=${token}` } }))
    expect(closed.status).toBe(409)
    expect(insertChatMessageForVisitorMock).not.toHaveBeenCalled()

    getChatConversationForVisitorMock.mockResolvedValueOnce({ ...activeConversation, status: 'spam' })
    const spam = await postMessage(jsonRequest('https://pillarsoftech.org/api/chat/messages', {
      conversationId,
      body: 'Still here?',
      honeypot: '',
    }, { headers: { cookie: `${CHAT_TOKEN_COOKIE}=${token}` } }))
    expect(spam.status).toBe(409)

    getChatConversationForVisitorMock.mockResolvedValueOnce(activeConversation)
    const sent = await postMessage(jsonRequest('https://pillarsoftech.org/api/chat/messages', {
      conversationId,
      body: 'Can you help?',
      honeypot: '',
    }, { headers: { cookie: `${CHAT_TOKEN_COOKIE}=${token}` } }))
    expect(sent.status).toBe(201)
    expect(insertChatMessageForVisitorMock).toHaveBeenCalledWith(expect.objectContaining({ id: conversationId }), expect.stringMatching(/^[0-9a-f]{64}$/), 'Can you help?')
    expect(consumeChatRateLimitMock).toHaveBeenCalledWith('chat-message', expect.any(String), expect.any(Object))
  })
})
