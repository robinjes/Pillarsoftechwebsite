/* eslint-disable @next/next/no-img-element */
/* eslint-disable @next/next/no-sync-scripts */
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react'

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: 'California' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }))
    fireEvent.click(screen.getByRole('button', { name: 'California' }))
    expect(screen.getByText('No upcoming events match this search.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All branches' }))

    const upcomingButton = screen.getByRole('button', { name: 'Upcoming' })
    fireEvent.click(upcomingButton)
    expect(upcomingButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Upcoming programs' })).toBeInTheDocument()
    expect(screen.getAllByText('Upcoming build').length).toBeGreaterThan(0)
    expect(screen.queryByText('Ongoing build')).not.toBeInTheDocument()

    const ongoingButton = screen.getByRole('button', { name: 'Ongoing' })
    fireEvent.click(ongoingButton)
    expect(ongoingButton).toHaveAttribute('aria-pressed', 'true')
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

    fireEvent.click(screen.getByRole('button', { name: 'Ongoing' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Georgia' }))
    expect(document.querySelectorAll('[data-event-card]')).toHaveLength(1)
    expect(document.querySelector('[data-event-card="open-program"]')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Read The Story/ })).toHaveAttribute('href', '/events/open-program')
    expect(screen.getByRole('link', { name: /Participant Registration/ })).toHaveAttribute('href', '/register/open-program')
    expect(screen.getByRole('link', { name: /Volunteer/ })).toHaveAttribute('href', '/volunteer?eventId=open-program')
  })

  it('uses the external registration link for current events without adding a photo to an unpictured event', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        makeEvent({
          id: 'stem-into-the-night-2026',
          slug: 'stem-into-the-night-2026',
          title: 'STEM Into the Night',
          summary: 'A free evening of STEM exploration.',
          date: 'November 4, 2026',
          time: '4:00 PM - 5:30 PM',
          media: {},
          registrationLink: 'https://luma.com/tnnv1nlg',
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

    const stemCard = document.querySelector('[data-event-card="stem-into-the-night-2026"]')
    const pastCard = document.querySelector('[data-event-card="past-event-with-old-link"]')
    expect(stemCard?.querySelector('img')).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Register on Luma' })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Register on Luma' })).toHaveAttribute('href', 'https://luma.com/tnnv1nlg')
    expect(pastCard?.querySelector('a[href="https://luma.com/old-event"]')).toBeNull()
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

    for (const name of ['Upcoming & ongoing', 'Completed programs', 'Cancelled programs']) {
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

    for (const name of ['Upcoming & ongoing', 'Completed programs']) {
      const heading = screen.getByRole('heading', { name })
      const headingWrapper = heading.parentElement?.parentElement
      expect(headingWrapper).not.toBeNull()
      expect(headingWrapper).toHaveClass('mb-6', 'sm:mb-8')
    }

    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }))
    const cancelledHeading = screen.getByRole('heading', { name: 'Cancelled programs' })
    const cancelledHeadingWrapper = cancelledHeading.parentElement?.parentElement
    expect(cancelledHeadingWrapper).not.toBeNull()
    expect(cancelledHeadingWrapper).toHaveClass('mb-6', 'sm:mb-8')
  })
})
