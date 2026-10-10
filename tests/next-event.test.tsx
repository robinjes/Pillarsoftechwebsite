import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PublicEvent } from '@/lib/content-contracts'
import { selectNextEvent } from '@/lib/next-event'
import NextEventSection from '@/components/site/NextEventSection'

const now = Date.parse('2026-10-10T19:00:00Z')
const makeEvent = (overrides: Partial<PublicEvent> = {}): PublicEvent => ({
  id: 'workshop', slug: 'workshop', branch: 'ca', title: 'Workshop', summary: '', description: '',
  startsAt: '2026-10-11T23:00:00Z', endsAt: '2026-10-12T01:00:00Z', timezone: 'America/Los_Angeles',
  startLabel: 'October 11, 2026', endLabel: '4–6 PM', date: 'October 11, 2026', time: '4–6 PM',
  location: 'School', programCategory: 'general', status: 'upcoming', media: {}, resources: {},
  participantRegistrationState: 'closed', volunteerRegistrationState: 'closed', ...overrides,
})

afterEach(cleanup)

describe('homepage next event', () => {
  it('ignores finished events even when their status is still upcoming or ongoing', () => {
    for (const status of ['upcoming', 'ongoing'] as const) {
      expect(selectNextEvent([makeEvent({ status, startsAt: '2026-10-09T19:00:00Z', endsAt: '2026-10-09T21:00:00Z' })], now)).toBeNull()
    }
  })

  it('selects the nearest scheduled event regardless of input order', () => {
    const nearest = makeEvent({ id: 'nearest' })
    const later = makeEvent({ id: 'later', startsAt: '2026-11-01T19:00:00Z', endsAt: null })
    const events = [later, nearest]
    expect(selectNextEvent(events, now)).toBe(nearest)
    expect(events).toEqual([later, nearest])
  })

  it('keeps an event while it is running and removes it exactly at its end', () => {
    const event = makeEvent({ startsAt: '2026-10-10T18:00:00Z', endsAt: '2026-10-10T20:00:00Z' })
    expect(selectNextEvent([event], now)).toBe(event)
    expect(selectNextEvent([event], Date.parse(event.endsAt!))).toBeNull()
  })

  it('requires a valid schedule and excludes cancelled or completed events', () => {
    expect(selectNextEvent([
      makeEvent({ status: 'cancelled' }), makeEvent({ status: 'completed' }),
      makeEvent({ startsAt: null }), makeEvent({ startsAt: 'invalid' }),
      makeEvent({ endsAt: 'invalid' }), makeEvent({ endsAt: '2026-10-09T19:00:00Z' }),
    ], now)).toBeNull()
    expect(selectNextEvent([], now)).toBeNull()
  })

  it('does not keep events indefinitely when no end time is supplied', () => {
    const event = makeEvent({ endsAt: null })
    expect(selectNextEvent([event], now)).toBe(event)
    expect(selectNextEvent([event], Date.parse(event.startsAt!))).toBeNull()
  })

  it('uses the selected event poster without assigning an unsupported audience', () => {
    const event = makeEvent({ image: '/images/events/career-panel-granada/poster.png', imageAlt: 'Career Panel poster', media: {} })
    render(<NextEventSection event={event} />)
    expect(screen.getByRole('img', { name: 'Career Panel poster' })).toHaveStyle({ objectFit: 'contain' })
    expect(screen.queryByText('8th-12th graders and their families')).not.toBeInTheDocument()
    expect(screen.getByText('Our next event')).toBeInTheDocument()
  })

  it('shows only the past-events link when no upcoming event exists', () => {
    const { container } = render(<NextEventSection event={null} />)
    expect(screen.getByRole('link', { name: 'View our past events' })).toHaveAttribute('href', '/events?status=completed')
    expect(screen.queryByText('Details coming soon')).not.toBeInTheDocument()
    expect(screen.queryByText('Our next family STEM event')).not.toBeInTheDocument()
    expect(container.querySelector('.event-panel')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })
})
