import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { JudgingUnavailableError } from '@/lib/judging-server'

const LIFETIME = 7 * 24 * 60 * 60 * 1000
const DOMAIN = 'pillars-of-tech:judging-broadcast:v1\u0000'

function signature(payload: string) {
  const pepper = process.env.CHAT_TOKEN_PEPPER?.trim()
  if (!pepper) throw new JudgingUnavailableError()
  return createHmac('sha256', pepper).update(DOMAIN).update(payload).digest('base64url')
}

export function createBroadcastToken(eventId: string, now = Date.now()) {
  const expiresAt = now + LIFETIME
  const payload = `${z.uuid().parse(eventId)}.${expiresAt}`
  return { token: `${payload}.${signature(payload)}`, expiresAt: new Date(expiresAt).toISOString() }
}

export function verifyBroadcastToken(token: string, now = Date.now()): string | null {
  if (token.length > 160) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [eventId, expiry, given] = parts
  if (!z.uuid().safeParse(eventId).success || !/^\d{13}$/.test(expiry)) return null
  const expiresAt = Number(expiry)
  if (expiresAt <= now || expiresAt > now + LIFETIME) return null
  const expected = Buffer.from(signature(`${eventId}.${expiry}`))
  const actual = Buffer.from(given)
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? eventId : null
}
