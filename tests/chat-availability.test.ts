import { describe, expect, it } from 'vitest'

import {
  CANONICAL_CHAT_SCHEDULE,
  getChatAvailability,
  getNextChatOpening,
  type ChatOfficeHour,
} from '@/lib/chat-availability'

const openQueue = { queueOpen: true, queueExpiresAt: '2026-08-27T05:00:00.000Z' }
const closedQueue = { queueOpen: false, queueExpiresAt: null }

function instant(value: string): Date {
  return new Date(value)
}

describe('chat availability', () => {
  it('opens exactly at 16:00 Pacific and closes exactly at 22:00', () => {
    const availability = getChatAvailability(instant('2026-08-26T23:00:00.000Z'), openQueue, CANONICAL_CHAT_SCHEDULE)
    expect(availability.state).toBe('open')
    expect(availability).toMatchObject({
      days: 'Monday–Friday',
      opensAt: '16:00',
      closesAt: '22:00',
      label: 'Monday–Friday, 4:00–10:00 PM Pacific',
    })
    expect(getChatAvailability(instant('2026-08-27T04:59:59.999Z'), openQueue, CANONICAL_CHAT_SCHEDULE).state).toBe('open')
    expect(getChatAvailability(instant('2026-08-27T05:00:00.000Z'), openQueue, CANONICAL_CHAT_SCHEDULE).state).toBe('closed')
  })

  it('fails closed for a manually closed queue and never treats weekends as open', () => {
    expect(getChatAvailability(instant('2026-08-26T23:00:00.000Z'), closedQueue, CANONICAL_CHAT_SCHEDULE).state).toBe('scheduled_offline')
    expect(getChatAvailability(instant('2026-08-29T23:00:00.000Z'), {
      queueOpen: true,
      queueExpiresAt: '2026-08-30T05:00:00.000Z',
    }, CANONICAL_CHAT_SCHEDULE).state).toBe('closed')
  })

  it('computes the next Monday opening across a weekend', () => {
    const next = getNextChatOpening(instant('2026-08-29T23:00:00.000Z'), CANONICAL_CHAT_SCHEDULE)
    expect(next?.toISOString()).toBe('2026-08-31T23:00:00.000Z')
  })

  it('computes the same-day opening before office hours', () => {
    const next = getNextChatOpening(instant('2026-08-26T22:59:59.000Z'), CANONICAL_CHAT_SCHEDULE)
    expect(next?.toISOString()).toBe('2026-08-26T23:00:00.000Z')
  })

  it('uses the correct PDT offset after spring DST and PST offset after fall DST', () => {
    const afterSpring = getNextChatOpening(instant('2026-03-08T23:30:00.000Z'), CANONICAL_CHAT_SCHEDULE)
    expect(afterSpring?.toISOString()).toBe('2026-03-09T23:00:00.000Z')

    const afterFall = getNextChatOpening(instant('2026-11-01T23:30:00.000Z'), CANONICAL_CHAT_SCHEDULE)
    expect(afterFall?.toISOString()).toBe('2026-11-03T00:00:00.000Z')
  })

  it('fails closed when the schedule is missing or malformed', () => {
    expect(getChatAvailability(instant('2026-08-26T23:00:00.000Z'), {
      queueOpen: true,
      queueExpiresAt: '2026-08-27T05:00:00.000Z',
    }, [])).toMatchObject({
      state: 'closed',
      queueOpen: false,
      days: 'Monday–Friday',
      opensAt: '16:00',
      closesAt: '22:00',
      label: 'Monday–Friday, 4:00–10:00 PM Pacific',
    })
    const malformed = [{ weekday: 3, openTime: 'not-a-time', closeTime: '22:00', timezone: 'America/Los_Angeles' }] as unknown as ChatOfficeHour[]
    expect(getChatAvailability(instant('2026-08-26T23:00:00.000Z'), {
      queueOpen: true,
      queueExpiresAt: '2026-08-27T05:00:00.000Z',
    }, malformed).state).toBe('closed')
    expect(getNextChatOpening(instant('2026-08-26T23:00:00.000Z'), malformed)).toBeNull()
    expect(getChatAvailability(instant('2026-08-26T23:00:00.000Z'), {
      queueOpen: true,
      queueExpiresAt: '2026-08-27T05:00:00.000Z',
    }, CANONICAL_CHAT_SCHEDULE.slice(0, 4)).state).toBe('closed')
  })

  it('treats a missing, expired, or prior-day queue lease as offline', () => {
    const now = instant('2026-08-27T00:00:00.000Z')
    expect(getChatAvailability(now, {
      queueOpen: true,
      queueExpiresAt: null,
    }, CANONICAL_CHAT_SCHEDULE).state).toBe('scheduled_offline')
    expect(getChatAvailability(now, {
      queueOpen: true,
      queueExpiresAt: '2026-08-26T05:00:00.000Z',
    }, CANONICAL_CHAT_SCHEDULE).state).toBe('scheduled_offline')
    expect(getChatAvailability(now, {
      queueOpen: true,
      queueExpiresAt: '2026-08-27T05:00:00.000Z',
    }, CANONICAL_CHAT_SCHEDULE).state).toBe('open')
  })
})
