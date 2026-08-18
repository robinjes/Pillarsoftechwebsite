const WINDOW_MS = 10 * 60 * 1_000
const MAX_ATTEMPTS = 5
const attempts = new Map<string, number[]>()

export function allowContactAttempt(identity: string, now = Date.now()): boolean {
  const recent = (attempts.get(identity) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS)
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(identity, recent)
    return false
  }
  recent.push(now)
  attempts.set(identity, recent)
  return true
}

export function resetContactAbuseForTests() {
  attempts.clear()
}
