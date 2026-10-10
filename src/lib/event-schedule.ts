/** Convert event instants to wall-clock values without using the browser's timezone. */
export function eventLocalDateTime(instant: string | null, timezone: string): string {
  if (!instant) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const value = (type: string) => parts.find((part) => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}`
}

export function eventScheduleInstant(local: string, timezone: string, existingInstant?: string | null): string | null {
  // Validate the timezone even when the schedule is empty.
  new Intl.DateTimeFormat('en-US', { timeZone: timezone })
  if (!local) return null
  const normalized = local.length === 16 ? `${local}:00` : local
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) throw new Error('Enter a valid event date and time.')
  if (existingInstant && eventLocalDateTime(existingInstant, timezone) === normalized) return existingInstant
  const wallTime = Date.parse(`${normalized}Z`)
  if (!Number.isFinite(wallTime)) throw new Error('Enter a valid event date and time.')
  // Inspect offsets on either side of a DST transition. Ambiguous times use
  // the earlier occurrence; nonexistent times are rejected instead of shifted.
  const candidates = [-36, 0, 36].map((hours) => {
    const sample = wallTime + hours * 60 * 60 * 1000
    const formatted = eventLocalDateTime(new Date(sample).toISOString(), timezone)
    const offset = Date.parse(`${formatted}Z`) - sample
    return wallTime - offset
  }).sort((a, b) => a - b)
  const instant = candidates.find((candidate) => eventLocalDateTime(new Date(candidate).toISOString(), timezone) === normalized)
  if (instant === undefined) throw new Error('This date or time does not exist in the event timezone. Choose another time.')
  return new Date(instant).toISOString()
}

export function eventScheduleLabels(startsAt: string | null, endsAt: string | null, timezone: string) {
  if (!startsAt) return { startLabel: '', endLabel: '' }
  const date = new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'long', day: 'numeric', year: 'numeric' })
  const time = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
  const startDate = date.format(new Date(startsAt))
  const endDate = endsAt ? date.format(new Date(endsAt)) : startDate
  return {
    startLabel: startDate === endDate ? startDate : `${startDate} – ${endDate}`,
    endLabel: endsAt ? `${time.format(new Date(startsAt))} – ${time.format(new Date(endsAt))}` : time.format(new Date(startsAt)),
  }
}
