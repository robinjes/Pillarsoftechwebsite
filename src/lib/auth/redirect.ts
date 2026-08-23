export const DEFAULT_AUTH_NEXT = '/admin'

const AUTH_ORIGIN = 'https://auth.invalid'
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/
const EVENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/

function containsEncodedControlCharacter(value: string): boolean {
  let candidate = value

  // URLSearchParams decodes the callback query once before this helper sees
  // it. Decode a few additional layers so a destination cannot smuggle an
  // ASCII control character through a double-encoded next value.
  for (let pass = 0; pass < 4; pass += 1) {
    if (CONTROL_CHARACTER_PATTERN.test(candidate)) return true

    let decoded: string
    try {
      decoded = decodeURIComponent(candidate)
    } catch {
      return true
    }

    if (decoded === candidate) return false
    candidate = decoded
  }

  return CONTROL_CHARACTER_PATTERN.test(candidate)
}

/** Accept only the two post-auth surfaces used by this application. */
export function isSafeNextPath(value: string | null | undefined): value is string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return false
  if (containsEncodedControlCharacter(value)) return false

  let destination: URL
  try {
    destination = new URL(value, AUTH_ORIGIN)
  } catch {
    return false
  }

  if (destination.origin !== AUTH_ORIGIN || destination.hash) return false
  if (destination.pathname === '/admin') return destination.search === ''
  if (destination.pathname !== '/volunteer') return false

  const eventParams = [...destination.searchParams.entries()]
  return (
    eventParams.length === 0 ||
    (eventParams.length === 1 && eventParams[0]?.[0] === 'eventId' && EVENT_ID_PATTERN.test(eventParams[0][1]))
  )
}

export function getSafeNextPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_NEXT
): string {
  return isSafeNextPath(value) ? value : fallback
}
