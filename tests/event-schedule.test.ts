import { describe, expect, it } from 'vitest'
import { eventLocalDateTime, eventScheduleInstant, eventScheduleLabels } from '@/lib/event-schedule'

describe('event schedules', () => {
  it('uses the event timezone rather than the browser timezone', () => {
    expect(eventScheduleInstant('2026-10-10T16:30', 'America/Los_Angeles')).toBe('2026-10-10T23:30:00.000Z')
    expect(eventScheduleInstant('2026-10-10T16:30', 'America/New_York')).toBe('2026-10-10T20:30:00.000Z')
    expect(eventLocalDateTime('2026-10-10T23:30:00Z', 'America/Los_Angeles')).toBe('2026-10-10T16:30:00')
    expect(eventScheduleInstant('', 'UTC')).toBeNull()
  })

  it('rejects nonexistent dates, DST gaps, and invalid timezones', () => {
    expect(() => eventScheduleInstant('2026-03-08T02:30', 'America/Los_Angeles')).toThrow('does not exist')
    expect(() => eventScheduleInstant('2026-02-30T16:00', 'UTC')).toThrow('does not exist')
    expect(() => eventScheduleInstant('', 'Bad/Timezone')).toThrow()
  })

  it('chooses the earlier occurrence of a repeated time and preserves seconds', () => {
    expect(eventScheduleInstant('2026-11-01T01:30:12', 'America/Los_Angeles')).toBe('2026-11-01T08:30:12.000Z')
    expect(eventScheduleInstant('2026-11-01T01:30:12', 'America/Los_Angeles', '2026-11-01T09:30:12.000Z')).toBe('2026-11-01T09:30:12.000Z')
  })

  it('generates public labels for same-day and overnight events', () => {
    expect(eventScheduleLabels('2026-10-10T23:00:00Z', '2026-10-11T01:00:00Z', 'America/Los_Angeles')).toEqual({
      startLabel: 'October 10, 2026', endLabel: '4:00 PM PDT – 6:00 PM PDT',
    })
    expect(eventScheduleLabels('2026-10-11T06:00:00Z', '2026-10-11T09:00:00Z', 'America/Los_Angeles').startLabel).toBe('October 10, 2026 – October 11, 2026')
  })
})
