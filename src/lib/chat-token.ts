import 'server-only'

import { createHmac, randomBytes } from 'node:crypto'

import {
  CHAT_TOKEN_COOKIE,
  CHAT_TOKEN_TTL_SECONDS,
  isValidChatRequestNonce,
} from '@/lib/chat-contracts'

export { CHAT_TOKEN_COOKIE }

export const CHAT_TOKEN_BYTES = 32
export const CHAT_TOKEN_COOKIE_PATH = '/api/chat'
const CHAT_NONCE_DOMAIN = 'pillars-of-tech:chat-cookie:v1\u0000'

const tokenPattern = /^[A-Za-z0-9_-]{43}$/

export class ChatTokenConfigurationError extends Error {
  constructor() {
    super('Chat ownership is temporarily unavailable.')
    this.name = 'ChatTokenConfigurationError'
  }
}

function chatTokenPepper(): string {
  const pepper = process.env.CHAT_TOKEN_PEPPER?.trim()
  if (!pepper) throw new ChatTokenConfigurationError()
  return pepper
}

export function isValidChatToken(value: unknown): value is string {
  return typeof value === 'string' && tokenPattern.test(value)
}

/** Generate one opaque token; its raw value is never persisted. */
export function generateChatToken(): string {
  return randomBytes(CHAT_TOKEN_BYTES).toString('base64url')
}

/**
 * Derive the opaque cookie token for a first-request retry. The fixed domain
 * separator keeps this derivation independent from all other peppered HMAC
 * values, while the raw nonce remains a browser-memory/request-only value.
 */
export function deriveChatTokenFromNonce(requestNonce: string): string {
  if (!isValidChatRequestNonce(requestNonce)) throw new ChatTokenConfigurationError()
  const token = createHmac('sha256', chatTokenPepper())
    .update(CHAT_NONCE_DOMAIN, 'utf8')
    .update(requestNonce, 'utf8')
    .digest('base64url')
  if (!isValidChatToken(token) || Buffer.from(token, 'base64url').byteLength !== CHAT_TOKEN_BYTES) {
    throw new ChatTokenConfigurationError()
  }
  return token
}

/** Store only this keyed digest in Supabase, never the raw cookie token. */
export function hashChatToken(token: string): string {
  if (!isValidChatToken(token)) throw new ChatTokenConfigurationError()
  return createHmac('sha256', chatTokenPepper()).update(token, 'utf8').digest('hex')
}

function parseCookieHeader(value: string | null): string | null {
  if (!value) return null
  const matching = value
    .split(';')
    .map((item) => item.trim())
    .filter((item) => item.startsWith(`${CHAT_TOKEN_COOKIE}=`))
  if (matching.length !== 1) return null
  const token = matching[0].slice(`${CHAT_TOKEN_COOKIE}=`.length)
  return isValidChatToken(token) ? token : null
}

export function getChatTokenFromRequest(request: Request): string | null {
  return parseCookieHeader(request.headers.get('cookie'))
}

export function getChatTokenDigestFromRequest(request: Request): string | null {
  const token = getChatTokenFromRequest(request)
  if (!token) return null
  try {
    return hashChatToken(token)
  } catch {
    return null
  }
}

function cookieHeader(token: string, now: Date, maxAge: number): string {
  const expires = new Date(now.getTime() + maxAge * 1_000)
  return [
    `${CHAT_TOKEN_COOKIE}=${token}`,
    `Max-Age=${maxAge}`,
    `Expires=${expires.toUTCString()}`,
    `Path=${CHAT_TOKEN_COOKIE_PATH}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ')
}

export function setChatTokenCookie(response: Response, token: string, now = new Date()): void {
  if (!isValidChatToken(token) || !Number.isFinite(now.getTime())) throw new ChatTokenConfigurationError()
  response.headers.append('Set-Cookie', cookieHeader(token, now, CHAT_TOKEN_TTL_SECONDS))
}

export function clearChatTokenCookie(response: Response, now = new Date()): void {
  if (!Number.isFinite(now.getTime())) return
  response.headers.append('Set-Cookie', cookieHeader('', now, 0))
}
