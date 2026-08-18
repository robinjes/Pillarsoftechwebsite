export const CONTACT_ABUSE_WINDOW_MS = 10 * 60 * 1_000
export const CONTACT_ABUSE_MAX_ATTEMPTS = 5
export const CONTACT_ABUSE_MAX_IDENTITIES = 2_048
export const CONTACT_ABUSE_MAX_IDENTITY_LENGTH = 128
const attempts = new Map<string, number[]>()

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

function prune(now: number): void {
  for (const [identity, timestamps] of attempts) {
    const recent = timestamps.filter((timestamp) => now - timestamp < CONTACT_ABUSE_WINDOW_MS)
    if (recent.length === 0) attempts.delete(identity)
    else attempts.set(identity, recent)
  }
}

function evictOldest(): void {
  let oldestIdentity: string | undefined
  let oldestTimestamp = Number.POSITIVE_INFINITY
  for (const [identity, timestamps] of attempts) {
    const timestamp = timestamps[timestamps.length - 1] ?? Number.POSITIVE_INFINITY
    if (timestamp < oldestTimestamp) {
      oldestTimestamp = timestamp
      oldestIdentity = identity
    }
  }
  if (oldestIdentity !== undefined) attempts.delete(oldestIdentity)
}

export function allowContactAttempt(identity: string, now = Date.now()): boolean {
  prune(now)
  const normalizedIdentity = normalizeContactIdentity(identity)
  const recent = (attempts.get(normalizedIdentity) ?? []).filter((timestamp) => now - timestamp < CONTACT_ABUSE_WINDOW_MS)
  if (recent.length >= CONTACT_ABUSE_MAX_ATTEMPTS) {
    attempts.set(normalizedIdentity, recent)
    return false
  }
  if (!attempts.has(normalizedIdentity) && attempts.size >= CONTACT_ABUSE_MAX_IDENTITIES) evictOldest()
  recent.push(now)
  attempts.set(normalizedIdentity, recent)
  return true
}

export function resetContactAbuseForTests() {
  attempts.clear()
}
