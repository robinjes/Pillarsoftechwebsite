import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  CHAT_TOKEN_COOKIE,
  generateChatToken,
  getChatTokenFromRequest,
  hashChatToken,
  setChatTokenCookie,
} from '@/lib/chat-token'

describe('chat visitor token ownership', () => {
  it('generates exactly 32 random bytes encoded as an opaque base64url token', () => {
    vi.stubEnv('CHAT_TOKEN_PEPPER', 'test-pepper')
    const token = generateChatToken()
    expect(Buffer.from(token, 'base64url')).toHaveLength(32)
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(hashChatToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashChatToken(token)).not.toContain(token)
  })

  it('sets a secure, path-scoped cookie with bounded expiry and reads only valid values', () => {
    vi.stubEnv('CHAT_TOKEN_PEPPER', 'test-pepper')
    const token = generateChatToken()
    const response = new Response(null)
    const now = new Date('2026-08-26T12:00:00.000Z')
    setChatTokenCookie(response, token, now)
    const header = response.headers.get('set-cookie') ?? ''
    expect(header).toContain(`${CHAT_TOKEN_COOKIE}=${token}`)
    expect(header).toContain('HttpOnly')
    expect(header).toContain('Secure')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/api/chat')
    expect(header).toContain('Max-Age=2592000')
    expect(header).toContain('Expires=')

    const request = new Request('https://pillarsoftech.org/api/chat/messages', {
      headers: { cookie: `${CHAT_TOKEN_COOKIE}=${token}` },
    })
    expect(getChatTokenFromRequest(request)).toBe(token)
    expect(getChatTokenFromRequest(new Request(request.url, { headers: { cookie: `${CHAT_TOKEN_COOKIE}=bad` } }))).toBeNull()
    expect(getChatTokenFromRequest(new Request(request.url))).toBeNull()
  })
})
