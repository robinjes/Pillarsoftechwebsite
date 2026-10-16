/* eslint-disable @next/next/no-img-element */
import type { ImgHTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublicEvent } from '@/lib/content-contracts'
import { careerPanelists } from '@/lib/career-panel-details'

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'career-panel-granada' }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}))

import EventPage from '@/app/events/[id]/page'

const event: PublicEvent = {
  id: 'career-panel-granada', slug: 'career-panel-granada', branch: 'ca', title: 'Career Panel',
  summary: '', description: 'Explore careers in STEM.',
  startsAt: '2026-10-29T00:30:00.000Z', endsAt: '2026-10-29T03:30:00.000Z',
  timezone: 'America/Los_Angeles', startLabel: 'October 28, 2026', endLabel: '',
  date: 'October 28, 2026', time: '5:30 PM - 8:30 PM', location: 'Granada High School',
  programCategory: 'general', status: 'upcoming', media: {}, resources: {},
  participantRegistrationState: 'closed', volunteerRegistrationState: 'open',
  registrationLink: 'https://luma.com/event/evt-Kt3fAmxzXjJdAH2',
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function renderPage() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [event] }))
  const result = render(<EventPage />)
  await screen.findByRole('heading', { name: 'Career Panel', level: 1 })
  return result
}

describe('Career Panel page', () => {
  it('puts event essentials and a working free checkout before the panelist section', async () => {
    await renderPage()
    expect(screen.getByText('October 28, 2026')).toBeVisible()
    expect(screen.getByText(/5:30 PM - 8:30 PM/)).toBeVisible()
    expect(screen.getByText('Granada High School Student Union')).toBeVisible()
    const registration = screen.getByRole('complementary', { name: 'Join the Career Panel' })
    const checkout = within(registration).getByRole('link', { name: 'Register for FREE' })
    expect(checkout).toHaveAttribute('href', event.registrationLink)
    expect(checkout).toHaveAttribute('data-luma-action', 'checkout')
    const panelists = screen.getByRole('region', { name: 'Meet the panelists' })
    expect(registration.compareDocumentPosition(panelists) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volunteer at this event' })).toHaveAttribute('href', '/volunteer?eventId=career-panel-granada')
  })

  it('shows all seven profiles while letting readers expand and collapse individual bios', async () => {
    await renderPage()
    const panelists = screen.getByRole('region', { name: 'Meet the panelists' })
    const profiles = within(panelists).getAllByRole('listitem')
    expect(profiles).toHaveLength(7)
    for (const [index, profile] of profiles.entries()) {
      expect(within(profile).getByText(careerPanelists[index].name)).toBeVisible()
      expect(profile.querySelector('img')).toHaveAttribute('src', careerPanelists[index].photo)
      expect(within(profile).getByText(careerPanelists[index].bio)).not.toBeVisible()
    }
    const firstProfile = profiles[0]
    fireEvent.click(firstProfile.querySelector('summary')!)
    expect(within(firstProfile).getByText(careerPanelists[0].bio)).toBeVisible()
    expect(within(profiles[1]).getByText(careerPanelists[1].bio)).not.toBeVisible()
    fireEvent.click(firstProfile.querySelector('summary')!)
    expect(within(firstProfile).getByText(careerPanelists[0].bio)).not.toBeVisible()
  })

  it('shows the flyer by default and keeps the agenda available on demand', async () => {
    const { container } = await renderPage()
    const agendaTitle = screen.getByText('Evening agenda')
    expect(screen.getByText('Welcome & Introduction')).not.toBeVisible()
    fireEvent.click(agendaTitle)
    expect(screen.getByText('Welcome & Introduction')).toBeVisible()
    const poster = container.querySelector('img[src$="poster.png"]')
    expect(poster).toBeVisible()
    expect(screen.getByRole('complementary', { name: 'Join the Career Panel' })).toContainElement(poster as HTMLElement)
  })
})
