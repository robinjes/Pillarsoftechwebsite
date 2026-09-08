import 'server-only'

import { isIP } from 'node:net'

import { normalizeContactIdentity } from '@/lib/contact-abuse'

export const REQUEST_IDENTITY_FALLBACK = 'unknown-client'
const VERCEL_TRUST_FLAG = '1'
const VERCEL_FORWARDED_FOR_HEADER = 'x-vercel-forwarded-for'
const MAX_IP_TEXT_LENGTH = 45

function validPlatformIp(value: string | null): string | null {
  if (!value) return null
  const candidate = value.trim()
  // Vercel supplies one client address in this header. Reject a forwarded
  // chain instead of guessing which hop is authoritative.
  if (!candidate || candidate.length > MAX_IP_TEXT_LENGTH || candidate.includes(',')) return null
  return isIP(candidate) ? candidate : null
}

/**
 * Return only a platform-attested address for abuse bucketing. Ordinary
 * browser-controlled forwarding headers are deliberately ignored. When the
 * deployment cannot attest the address, every request shares one bounded
 * fallback bucket so an attacker cannot choose arbitrary identities.
 */
export function getRequestIdentity(request: Request): string {
  if (process.env.VERCEL !== VERCEL_TRUST_FLAG) return REQUEST_IDENTITY_FALLBACK
  return normalizeContactIdentity(validPlatformIp(request.headers.get(VERCEL_FORWARDED_FOR_HEADER)) ?? REQUEST_IDENTITY_FALLBACK)
}

// Keep the boundary discoverable for the contact and future chat routes.
export const requestIdentity = getRequestIdentity
