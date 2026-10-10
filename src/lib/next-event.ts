import type { PublicEvent } from '@/lib/content-contracts'

export function selectNextEvent(events: PublicEvent[], now = Date.now()): PublicEvent | null {
  return events
    .filter((event) => {
      if (event.status !== 'upcoming' && event.status !== 'ongoing') return false
      if (!event.startsAt) return false
      const start = Date.parse(event.startsAt)
      if (!Number.isFinite(start)) return false
      const end = event.endsAt ? Date.parse(event.endsAt) : null
      if (end !== null && (!Number.isFinite(end) || end <= start)) return false
      // Keep an event visible while it is running. Without a known end,
      // stop promoting it once its scheduled start has passed.
      return start > now || (end !== null && end > now)
    })
    .sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!))[0] ?? null
}
