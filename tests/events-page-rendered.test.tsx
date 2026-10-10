/* eslint-disable @next/next/no-img-element */
/* eslint-disable @next/next/no-sync-scripts */
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react'

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ fill, priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => (
    <img
      {...props}
      alt={props.alt ?? ''}
      data-next-fill={fill ? 'true' : undefined}
      data-next-priority={priority ? 'true' : undefined}
    />
  ),
}))

vi.mock('next/script', () => ({
  default: ({ id, src, nonce, strategy }: { id: string; src: string; nonce?: string; strategy?: string }) => (
    <script id={id} src={src} nonce={nonce} data-next-script-strategy={strategy} />
  ),
}))

import EventsPage from '@/app/events/page'

type EventFixture = Record<string, unknown>

const makeEvent = (overrides: EventFixture = {}): EventFixture => ({
  id: 'program-one',
  slug: 'program-one',
  title: 'Upcoming build',
  summary: 'A current hands-on program.',
  description: 'A current hands-on program.',
  startsAt: '2026-09-01T18:00:00.000Z',
  endsAt: '2026-09-01T20:00:00.000Z',
  timezone: 'America/Los_Angeles',
  startLabel: 'September 1, 2026',
  endLabel: 'September 1, 2026',
  date: 'September 1, 2026',
  time: '6:00 PM – 8:00 PM',
  location: 'Community Room',
  programCategory: 'robotics',
  status: 'upcoming',
  media: {},
  resources: {},
  participantRegistrationState: 'closed',
  volunteerRegistrationState: 'closed',
  branch: 'ga',
  ...overrides,
})

describe('EventsPage rendered filtering behavior', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    const nonceSource = document.createElement('script')
    nonceSource.id = 'organization-jsonld'
    nonceSource.nonce = 'events-test-nonce'
    document.body.append(nonceSource)
  })

  afterEach(() => {
    cleanup()
    document.getElementById('organization-jsonld')?.remove()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
    window.history.replaceState({}, '', '/')
  })

  it('orders upcoming cards by event start from nearest to furthest, with undated events last', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [
      makeEvent({ id: 'later', slug: 'later', title: 'Later event', startsAt: '2026-11-05T00:00:00Z', date: 'November 4, 2026' }),
      makeEvent({ id: 'undated', slug: 'undated', title: 'Date coming soon', startsAt: null, endsAt: null, date: 'Coming Soon', startLabel: 'Coming Soon' }),
      makeEvent({ id: 'nearest', slug: 'nearest', title: 'Nearest event', startsAt: '2026-10-29T00:30:00Z', date: 'October 28, 2026' }),
      makeEvent({ id: 'middle', slug: 'middle', title: 'Middle event', startsAt: '2026-11-01T17:00:00Z', date: 'November 1, 2026' }),
    ] })
    const { container } = render(<EventsPage />)
    await screen.findByRole('heading', { name: 'Nearest event' })
    expect(Array.from(container.querySelectorAll('#upcoming-events [data-event-card]'), (card) => card.getAttribute('data-event-card')))
      .toEqual(['nearest', 'middle', 'later', 'undated'])
  })

  it('uses event previews for current events and stories only for completed events', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [
      makeEvent({ programCategory: 'general' }),
      makeEvent({ id: 'ongoing', slug: 'ongoing', title: 'Current workshop', status: 'ongoing', image: '/images/poster.png' }),
      makeEvent({ id: 'past', slug: 'past', title: 'Past workshop', status: 'completed' }),
      makeEvent({ id: 'cancelled', slug: 'cancelled', title: 'Cancelled workshop', status: 'cancelled' }),
    ] })
    const { container } = render(<EventsPage />)
    await screen.findByRole('heading', { name: 'Upcoming build' })
    const upcoming = within(container.querySelector('[data-event-card="program-one"]') as HTMLElement)
    expect(upcoming.getByRole('link', { name: 'Learn More' })).toHaveAttribute('href', '/events/program-one')
    expect(upcoming.queryByRole('img')).not.toBeInTheDocument()
    expect(upcoming.queryByText('STEM program')).not.toBeInTheDocument()
    expect(upcoming.queryByText('General')).not.toBeInTheDocument()
    const ongoing = within(container.querySelector('[data-event-card="ongoing"]') as HTMLElement)
    expect(ongoing.getByRole('link', { name: 'Learn More' })).toHaveAttribute('href', '/events/ongoing')
    expect(ongoing.getByRole('img')).toHaveClass('object-contain')
    expect(ongoing.getByRole('img').parentElement).toHaveClass('aspect-square')
    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'all' } })
    expect(screen.getByRole('link', { name: 'Read The Story' })).toHaveAttribute('href', '/events/past')
    expect(screen.getByRole('link', { name: 'View Event Details' })).toHaveAttribute('href', '/events/cancelled')
  })

  it('shows current and past events together with section links and a clear divider', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [makeEvent(), makeEvent({ id: 'past', slug: 'past', title: 'Past workshop', status: 'completed' })] })
    const { container } = render(<EventsPage />)
    await screen.findByRole('heading', { name: 'Upcoming build' })
    expect(screen.getByRole('heading', { name: 'Past workshop' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Upcoming events ↓' })).toHaveAttribute('href', '#upcoming-events')
    expect(screen.getByRole('link', { name: 'Past events ↓' })).toHaveAttribute('href', '#past-events')
    expect(container.querySelector('#past-events')).toHaveClass('border-t-2', 'mt-16')
    expect(container.querySelector('details')).not.toHaveAttribute('open')
    fireEvent.change(screen.getByLabelText('Branch'), { target: { value: 'ca' } })
    expect(screen.queryByText('Past workshop')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Filters', { exact: true }))
    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'completed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(screen.getByLabelText('Branch')).toHaveValue('all')
    expect(screen.getByLabelText('Event status')).toHaveValue('all')
    expect(screen.getByRole('heading', { name: 'Upcoming build' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Past workshop' })).toBeInTheDocument()
    fireEvent.keyDown(container.querySelector('details')!, { key: 'Escape' })
    expect(container.querySelector('details')).not.toHaveAttribute('open')
  })

  it('opens the completed programs filter from the homepage past-events link', async () => {
    window.history.replaceState({}, '', '/events?status=completed')
    fetchMock.mockResolvedValue({ ok: true, json: async () => [makeEvent(), makeEvent({ id: 'past', slug: 'past', title: 'Past workshop', status: 'completed' })] })
    render(<EventsPage />)
    expect(await screen.findByRole('heading', { name: 'Past workshop' })).toBeInTheDocument()
    expect(screen.getByLabelText('Event status')).toHaveValue('completed')
    expect(screen.queryByText('Upcoming build')).not.toBeInTheDocument()
  })

  it('filters upcoming and ongoing records and exposes authoritative branch labels', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        makeEvent(),
        makeEvent({
          id: 'program-two',
          slug: 'program-two',
          title: 'Ongoing build',
          status: 'ongoing',
          branch: 'ga',
        }),
      ],
    })

    render(<EventsPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Upcoming & ongoing' })).toBeInTheDocument())

    expect(screen.getAllByText('Georgia').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Robotics').length).toBeGreaterThan(0)
    expect(screen.queryByText('robotics')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Branch')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'upcoming' } })
    fireEvent.change(screen.getByLabelText('Branch'), { target: { value: 'ca' } })
    expect(screen.getByText('No upcoming events match this search.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Branch'), { target: { value: 'all' } })

    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'upcoming' } })
    expect(screen.getByLabelText('Event status')).toHaveValue('upcoming')
    expect(screen.getByRole('heading', { name: 'Upcoming programs' })).toBeInTheDocument()
    expect(screen.getAllByText('Upcoming build').length).toBeGreaterThan(0)
    expect(screen.queryByText('Ongoing build')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'ongoing' } })
    expect(screen.getByLabelText('Event status')).toHaveValue('ongoing')
    expect(screen.getByRole('heading', { name: 'Ongoing programs' })).toBeInTheDocument()
    expect(screen.getAllByText('Ongoing build').length).toBeGreaterThan(0)
    expect(screen.queryByText('Upcoming build')).not.toBeInTheDocument()
  })

  it('shows an ongoing-specific empty state when no ongoing records are returned', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [makeEvent()],
    })

    render(<EventsPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Upcoming & ongoing' })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'ongoing' } })

    expect(screen.getByRole('heading', { name: 'Ongoing programs' })).toBeInTheDocument()
    expect(screen.getByText('No ongoing events match this search.')).toBeInTheDocument()
    expect(screen.getByText('There are no ongoing programs matching this search right now.')).toBeInTheDocument()
  })

  it('renders one card per filtered event and preserves exact action destinations', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        makeEvent({
          id: 'open-program',
          slug: 'open-program',
          title: 'Open program',
          participantRegistrationState: 'open',
          volunteerRegistrationState: 'open',
        }),
        makeEvent({ id: 'other-program', slug: 'other-program', title: 'Other program', branch: 'ca' }),
      ],
    })

    render(<EventsPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Upcoming & ongoing' })).toBeInTheDocument())

    expect(document.querySelectorAll('[data-event-card]')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Branch'), { target: { value: 'ga' } })
    expect(document.querySelectorAll('[data-event-card]')).toHaveLength(1)
    expect(document.querySelector('[data-event-card="open-program"]')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Learn More/ })).toHaveAttribute('href', '/events/open-program')
    expect(screen.getByRole('link', { name: /Participant Registration/ })).toHaveAttribute('href', '/register/open-program')
    expect(screen.getByRole('link', { name: /Volunteer/ })).toHaveAttribute('href', '/volunteer?eventId=open-program')
  })

  it('uses the external registration link for current events without adding a photo to an unpictured event', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        makeEvent({
          id: 'external-event',
          slug: 'external-event',
          title: 'External Event',
          summary: 'A free evening of STEM exploration.',
          date: 'November 4, 2026',
          time: '4:00 PM - 5:30 PM',
          media: {},
          registrationLink: 'https://luma.com/public-event',
          registrationNote: 'Register on Luma',
          participantRegistrationState: 'closed',
          volunteerRegistrationState: 'open',
        }),
        makeEvent({
          id: 'past-event-with-old-link',
          slug: 'past-event-with-old-link',
          title: 'Past event with an old link',
          status: 'completed',
          registrationLink: 'https://luma.com/old-event',
          registrationNote: 'Register on Luma',
          volunteerRegistrationState: 'open',
        }),
      ],
    })

    render(<EventsPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Upcoming & ongoing' })).toBeInTheDocument())

    const stemCard = document.querySelector('[data-event-card="external-event"]')
    expect(stemCard?.querySelector('img')).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Register on Luma' })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Register on Luma' })).toHaveAttribute('href', 'https://luma.com/public-event')
    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'completed' } })
    const pastCard = document.querySelector('[data-event-card="past-event-with-old-link"]')
    expect(pastCard).not.toBeNull()
    expect(pastCard?.querySelector('a[href="https://luma.com/old-event"]')).toBeNull()
  })

  it('shows Junction school-only registration as text while keeping volunteer signup available', async () => {
    const registrationNote = 'Registration is for Junction students only. The registration link will be shared through the school.'
    fetchMock.mockResolvedValue({ ok: true, json: async () => [makeEvent({
      id: 'stem-into-the-night-2026', slug: 'stem-into-the-night-2026', title: 'STEM Into the Night',
      registrationNote, participantRegistrationState: 'closed', volunteerRegistrationState: 'open',
    })] })
    render(<EventsPage />)
    expect(await screen.findByText(registrationNote)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Participant Registration|Register on Luma/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volunteer' })).toHaveAttribute('href', '/volunteer?eventId=stem-into-the-night-2026')
  })

  it('renders the Career Panel Luma checkout anchor and nonce-bearing vendor script', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        makeEvent({
          id: 'career-panel-granada',
          slug: 'career-panel-granada',
          title: 'Career Panel',
          branch: 'ca',
          registrationLink: 'https://luma.com/event/evt-Kt3fAmxzXjJdAH2',
          registrationNote: 'Use a non-school email.',
          participantRegistrationState: 'closed',
          volunteerRegistrationState: 'open',
        }),
      ],
    })

    render(<EventsPage />)
    const checkout = await screen.findByRole('link', { name: 'Register for Event' })

    expect(checkout).toHaveAttribute('href', 'https://luma.com/event/evt-Kt3fAmxzXjJdAH2')
    expect(checkout).toHaveClass('luma-checkout--button')
    expect(checkout).toHaveAttribute('data-luma-action', 'checkout')
    expect(checkout).toHaveAttribute('data-luma-event-id', 'evt-Kt3fAmxzXjJdAH2')
    expect(checkout).toHaveAttribute('target', '_blank')
    expect(screen.getByText('Use a non-school email.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volunteer/ })).toHaveAttribute('href', '/volunteer?eventId=career-panel-granada')
    expect(screen.queryByRole('link', { name: 'Participant Registration' })).not.toBeInTheDocument()

    await waitFor(() => expect(document.getElementById('luma-checkout')).toBeInTheDocument())
    expect(document.getElementById('luma-checkout')).toHaveAttribute('src', 'https://embed.lu.ma/checkout-button.js')
    expect(document.getElementById('luma-checkout')).toHaveAttribute('nonce', 'events-test-nonce')
  })

  it('keeps consistent spacing between every section heading and its content', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        makeEvent(),
        makeEvent({ id: 'completed-program', slug: 'completed-program', title: 'Completed build', status: 'completed' }),
        makeEvent({ id: 'cancelled-program', slug: 'cancelled-program', title: 'Cancelled build', status: 'cancelled' }),
      ],
    })

    render(<EventsPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Upcoming & ongoing' })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'all' } })
    for (const name of ['Upcoming & ongoing', 'Past events', 'Cancelled programs']) {
      const heading = screen.getByRole('heading', { name })
      const headingWrapper = heading.parentElement?.parentElement
      expect(headingWrapper).not.toBeNull()
      expect(headingWrapper).toHaveClass('mb-6', 'sm:mb-8')
    }
  })

  it('keeps the same heading spacing when sections render empty states', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    })

    render(<EventsPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Upcoming & ongoing' })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'all' } })
    for (const name of ['Upcoming & ongoing', 'Past events']) {
      const heading = screen.getByRole('heading', { name })
      const headingWrapper = heading.parentElement?.parentElement
      expect(headingWrapper).not.toBeNull()
      expect(headingWrapper).toHaveClass('mb-6', 'sm:mb-8')
    }

    fireEvent.change(screen.getByLabelText('Event status'), { target: { value: 'cancelled' } })
    const cancelledHeading = screen.getByRole('heading', { name: 'Cancelled programs' })
    const cancelledHeadingWrapper = cancelledHeading.parentElement?.parentElement
    expect(cancelledHeadingWrapper).not.toBeNull()
    expect(cancelledHeadingWrapper).toHaveClass('mb-6', 'sm:mb-8')
  })
})
