import 'server-only'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Siteverify consumes each token once; neither tokens nor message content are stored here. */
export async function verifyContactCaptcha(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) throw new Error('CAPTCHA unavailable')
  const configuredHosts = process.env.TURNSTILE_ALLOWED_HOSTNAMES?.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean)
  const canonicalHost = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://pillarsoftech.org').hostname.toLowerCase()
  const allowedHosts = configuredHosts?.length ? configuredHosts : [canonicalHost, ...(canonicalHost === 'pillarsoftech.org' ? ['www.pillarsoftech.org'] : [])]
  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('CAPTCHA unavailable')
  const result: unknown = await response.json()
  if (!result || typeof result !== 'object') return false
  const data = result as Record<string, unknown>
  return data.success === true && data.action === 'contact' && typeof data.hostname === 'string' && allowedHosts.includes(data.hostname.toLowerCase())
}
