import {
  CHAT_TIME_ZONE,
  chatAvailabilitySchema,
  chatOfficeHourSchema,
  type ChatAvailability,
  type ChatAvailabilityState,
  type ChatOfficeHour,
} from '@/lib/chat-contracts'

export type { ChatOfficeHour }

export interface ChatQueueSnapshot {
  queueOpen: boolean
}

export interface ChatAvailabilityInput {
  state: ChatAvailabilityState
  queueOpen: boolean
  timezone: typeof CHAT_TIME_ZONE
  nextOpening: string | null
}

const canonicalIds = [
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
] as const

/** The only public schedule seed. Queue state is deliberately separate. */
export const CANONICAL_CHAT_SCHEDULE: ChatOfficeHour[] = [1, 2, 3, 4, 5].map((weekday, index) => ({
  id: canonicalIds[index],
  weekday,
  openTime: '16:00',
  closeTime: '22:00',
  timezone: CHAT_TIME_ZONE,
  enabled: true,
}))

const weekdayByName: Record<string, number> = {
  Sun: 7,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

interface ZonedParts {
  year: number
  month: number
  day: number
  weekday: number
  hour: number
  minute: number
  second: number
}

function formatterFor(timezone: string): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
  } catch {
    return null
  }
}

function zonedParts(value: Date, timezone: string): ZonedParts | null {
  if (!Number.isFinite(value.getTime())) return null
  const formatter = formatterFor(timezone)
  if (!formatter) return null
  const parts = Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]))
  const numeric = ['year', 'month', 'day', 'hour', 'minute', 'second'].map((key) => Number(parts[key]))
  if (numeric.some((number) => !Number.isInteger(number))) return null
  const [year, month, day, hour, minute, second] = numeric
  const weekday = weekdayByName[parts.weekday]
  if (!weekday) return null
  return { year, month, day, weekday, hour, minute, second }
}

function timeMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null
  const [hour, minute] = value.split(':').map(Number)
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

function validSchedule(schedule: unknown): schedule is ChatOfficeHour[] {
  if (!Array.isArray(schedule) || schedule.length !== 5) return false
  const weekdays = new Set<number>()
  for (const row of schedule) {
    const parsed = chatOfficeHourSchema.safeParse(row)
    if (
      !parsed.success
      || !parsed.data.enabled
      || parsed.data.timezone !== CHAT_TIME_ZONE
      || parsed.data.openTime !== '16:00'
      || parsed.data.closeTime !== '22:00'
      || parsed.data.weekday > 5
    ) return false
    const open = timeMinutes(parsed.data.openTime)
    const close = timeMinutes(parsed.data.closeTime)
    if (open === null || close === null || open >= close || weekdays.has(parsed.data.weekday)) return false
    weekdays.add(parsed.data.weekday)
  }
  return weekdays.size === 5 && [1, 2, 3, 4, 5].every((weekday) => weekdays.has(weekday))
}

function validQueue(value: unknown): value is ChatQueueSnapshot {
  return Boolean(value && typeof value === 'object' && 'queueOpen' in value && typeof value.queueOpen === 'boolean')
}

/**
 * Convert a wall-clock value in America/Los_Angeles into an instant. The
 * offset is derived from Intl rather than the host timezone, then iterated so
 * both PDT and PST remain deterministic. Office hours are at 16:00, away from
 * the spring-forward gap and fall-back fold.
 */
function wallClockToDate(
  wallClock: Pick<ZonedParts, 'year' | 'month' | 'day' | 'hour' | 'minute'>,
  timezone: string,
): Date | null {
  const targetAsUtc = Date.UTC(wallClock.year, wallClock.month - 1, wallClock.day, wallClock.hour, wallClock.minute, 0, 0)
  let candidate = targetAsUtc
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const actual = zonedParts(new Date(candidate), timezone)
    if (!actual) return null
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
    const offset = actualAsUtc - candidate
    const corrected = targetAsUtc - offset
    if (corrected === candidate) break
    candidate = corrected
  }
  const result = new Date(candidate)
  const verified = zonedParts(result, timezone)
  if (!verified) return null
  if (
    verified.year !== wallClock.year
    || verified.month !== wallClock.month
    || verified.day !== wallClock.day
    || verified.hour !== wallClock.hour
    || verified.minute !== wallClock.minute
  ) return null
  return result
}

function dayAtLocalOffset(parts: ZonedParts, offset: number): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

function nextOpeningFromValidSchedule(now: Date, schedule: ChatOfficeHour[]): Date | null {
  const nowParts = zonedParts(now, CHAT_TIME_ZONE)
  if (!nowParts) return null

  for (let dayOffset = 0; dayOffset <= 14; dayOffset += 1) {
    const date = dayAtLocalOffset(nowParts, dayOffset)
    const weekday = ((new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() + 6) % 7) + 1
    const rows = schedule.filter((row) => row.enabled && row.weekday === weekday)
    for (const row of rows) {
      const open = timeMinutes(row.openTime)
      if (open === null) continue
      const [hour, minute] = row.openTime.split(':').map(Number)
      const candidate = wallClockToDate({ ...date, hour, minute }, row.timezone)
      if (candidate && candidate.getTime() > now.getTime()) return candidate
    }
  }
  return null
}

function findCurrentRow(nowParts: ZonedParts, schedule: ChatOfficeHour[]): ChatOfficeHour | null {
  const row = schedule.find((item) => item.enabled && item.weekday === nowParts.weekday)
  if (!row) return null
  const open = timeMinutes(row.openTime)
  const close = timeMinutes(row.closeTime)
  if (open === null || close === null) return null
  const nowMinutes = nowParts.hour * 60 + nowParts.minute + nowParts.second / 60
  return nowMinutes >= open && nowMinutes < close ? row : null
}

/** Return the next valid local opening, or null for missing/malformed config. */
export function getNextChatOpening(now: Date, schedule: ChatOfficeHour[] = CANONICAL_CHAT_SCHEDULE): Date | null {
  if (!validSchedule(schedule)) return null
  return nextOpeningFromValidSchedule(now, schedule)
}

/**
 * Derive availability from validated schedule rows plus the explicit queue
 * flag. Scheduled hours alone never open chat; the queue flag is an additional
 * owner/staff gate.
 */
export function getChatAvailability(
  now: Date,
  queue: ChatQueueSnapshot,
  schedule: ChatOfficeHour[] = CANONICAL_CHAT_SCHEDULE,
): ChatAvailability {
  const safeNow = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date(Number.NaN)
  if (!validSchedule(schedule) || !validQueue(queue)) {
    return { state: 'closed', queueOpen: false, timezone: CHAT_TIME_ZONE, nextOpening: null }
  }

  const nowParts = zonedParts(safeNow, CHAT_TIME_ZONE)
  if (!nowParts) return { state: 'closed', queueOpen: queue.queueOpen, timezone: CHAT_TIME_ZONE, nextOpening: null }

  const current = findCurrentRow(nowParts, schedule)
  const nextOpening = nextOpeningFromValidSchedule(safeNow, schedule)?.toISOString() ?? null
  if (!current) return { state: 'closed', queueOpen: queue.queueOpen, timezone: CHAT_TIME_ZONE, nextOpening }
  if (!queue.queueOpen) return { state: 'scheduled_offline', queueOpen: false, timezone: CHAT_TIME_ZONE, nextOpening }
  return { state: 'open', queueOpen: true, timezone: CHAT_TIME_ZONE, nextOpening: null }
}

export function parseChatAvailability(value: unknown): ChatAvailability | null {
  const parsed = chatAvailabilitySchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
