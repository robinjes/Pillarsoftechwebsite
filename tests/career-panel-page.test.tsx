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
    const agendaLink = screen.getByRole('link', { name: 'View agenda' })
    expect(agendaLink).toHaveAttribute('href', '#career-agenda')
    expect(screen.getByRole('region', { name: 'Evening agenda' })).toHaveAttribute('id', 'career-agenda')
    expect(agendaLink.compareDocumentPosition(registration) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(registration.compareDocumentPosition(panelists) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volunteer at this event' })).toHaveAttribute('href', '/volunteer?eventId=career-panel-granada')
  })

  it('shows all nine profiles while letting readers expand and collapse individual bios', async () => {
    await renderPage()
    const panelists = screen.getByRole('region', { name: 'Meet the panelists' })
    const profiles = within(panelists).getAllByRole('listitem')
    expect(profiles).toHaveLength(9)
    for (const [index, profile] of profiles.entries()) {
      expect(within(profile).getByText(careerPanelists[index].name)).toBeVisible()
      if (careerPanelists[index].photo) {
        expect(profile.querySelector('img')).toHaveAttribute('src', careerPanelists[index].photo)
      } else {
        expect(profile.querySelector('img')).toBeNull()
        expect(within(profile).getByText(careerPanelists[index].initials)).toBeVisible()
      }
      expect(within(profile).getByText(careerPanelists[index].bio)).not.toBeVisible()
    }
    const firstProfile = profiles[0]
    fireEvent.click(firstProfile.querySelector('summary')!)
    expect(within(firstProfile).getByText(careerPanelists[0].bio)).toBeVisible()
    expect(within(profiles[1]).getByText(careerPanelists[1].bio)).not.toBeVisible()
    fireEvent.click(firstProfile.querySelector('summary')!)
    expect(within(firstProfile).getByText(careerPanelists[0].bio)).not.toBeVisible()
  })

  it('shows the flyer and the full agenda by default', async () => {
    const { container } = await renderPage()
    const agenda = screen.getByRole('region', { name: 'Evening agenda' })
    expect(agenda.querySelector('details')).toBeNull()
    expect(screen.getByText('Welcome & Opening Remarks')).toBeVisible()
    expect(screen.getByText('5:45–6:45 PM')).toBeVisible()
    expect(screen.getByText('6:45–7:45 PM')).toBeVisible()
    expect(screen.getByText('Panel 1: Discovering Your Path & The Scientific Horizon')).toBeVisible()
    expect(screen.getByText('Panel 2: Building Your Future: Career Strategy, Innovation & Impact')).toBeVisible()
    expect(screen.getByText(/Matthew Johnson, Anna Winter, Mark Dedon, Randy Simpson, Joel Bowers/)).toBeVisible()
    expect(screen.getByText(/Amy Aines, Yolanda Fintschenko, Roger Aines, Russ Walsh/)).toBeVisible()
    expect(screen.getByText('Open Q&A & Informal Connections')).toBeVisible()
    const poster = container.querySelector('img[src$="poster.png"]')
    expect(poster).toBeVisible()
    expect(screen.getByRole('complementary', { name: 'Join the Career Panel' })).toContainElement(poster as HTMLElement)
  })

  it('links to the exact Student Union pin and shows what attendees should bring', async () => {
    await renderPage()
    const directions = screen.getByRole('link', { name: /Get directions/ })
    expect(directions).toHaveAttribute('href', 'https://maps.app.goo.gl/byCurvSNVtUYMVLw5')
    expect(directions).toHaveAttribute('target', '_blank')
    expect(directions).toHaveAttribute('rel', 'noopener noreferrer')
    const faq = screen.getByRole('region', { name: 'Frequently asked questions' })
    expect(within(faq).getByText(/Bring your phone to show your ticket\. A notebook is optional/)).toBeVisible()
    expect(within(faq).getByText('Yes, food and drinks will be provided.')).toBeVisible()
  })
})
