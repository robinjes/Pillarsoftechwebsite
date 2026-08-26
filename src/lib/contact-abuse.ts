import { createHmac } from 'node:crypto'

export const CONTACT_ABUSE_MAX_IDENTITY_LENGTH = 128

export const CHAT_TOKEN_PEPPER_ENV = 'CHAT_TOKEN_PEPPER'

export function normalizeContactIdentity(identity: unknown): string {
  if (typeof identity !== 'string') return 'unknown-client'
  const normalized = identity
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, CONTACT_ABUSE_MAX_IDENTITY_LENGTH)
  return normalized || 'unknown-client'
}

/**
 * Return the HMAC key used by the durable limiter. This environment variable
 * is intentionally not a NEXT_PUBLIC_* value: the database only receives the
 * derived digest, never the source identity or the server pepper.
 */
function chatTokenPepper(): string {
  const pepper = process.env[CHAT_TOKEN_PEPPER_ENV]?.trim()
  if (!pepper) throw new Error('Contact abuse protection is not configured.')
  return pepper
}

export function hashContactIdentity(identity: unknown): string {
  return createHmac('sha256', chatTokenPepper())
    .update(normalizeContactIdentity(identity), 'utf8')
    .digest('hex')
}

// Aliases make the identity boundary explicit to the shared chat limiter.
export const hashRequestIdentity = hashContactIdentity
