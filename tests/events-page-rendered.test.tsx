/* eslint-disable @next/next/no-img-element */
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
  })

  afterEach(() => {
    cleanup()
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
})
