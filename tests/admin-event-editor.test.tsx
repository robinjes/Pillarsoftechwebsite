import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventRecord } from '@/lib/content-contracts'

vi.mock('@/lib/supabase/client', () => ({ supabase: null }))
import AdminEvents from '@/app/(admin-protected)/admin/events/page'

const event: EventRecord = {
  id: 'workshop', slug: 'workshop', branch: 'ca', title: 'Workshop', summary: 'Summary', description: 'Description',
  startsAt: '2026-10-10T23:00:00Z', endsAt: '2026-10-11T01:00:00Z', timezone: 'America/Los_Angeles',
  startLabel: 'October 10', endLabel: '4–6 PM', location: 'School', programCategory: 'general', status: 'upcoming',
  media: { gallery: ['/images/one.jpg'], galleryAlts: ['Original image'], youtubeVideos: [] }, resources: { registrationNote: 'Bring a friend' },
  participantRegistrationState: 'closed', volunteerRegistrationState: 'closed', participantCapacity: null, volunteerCapacity: 10,
  outcomes: { students: '20' }, publicationState: 'published',
}

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init?.method ? { event } : { events: [event] }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('admin event editor', () => {
  it('saves changed local dates, volunteer access, and capacity while retaining other content', async () => {
    render(<AdminEvents />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Start date and time')).toHaveValue('2026-10-10T16:00')
    fireEvent.change(screen.getByLabelText('Start date and time'), { target: { value: '2026-10-12T15:00' } })
    fireEvent.change(screen.getByLabelText('End date and time'), { target: { value: '2026-10-12T18:00' } })
    fireEvent.change(screen.getByLabelText('Volunteer registration'), { target: { value: 'open' } })
    fireEvent.change(screen.getByLabelText('Volunteer capacity'), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save event' }))
    await screen.findByText('Event saved.')
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
    expect(call[0]).toBe('/api/admin/events?id=workshop')
    expect(JSON.parse(call[1].body)).toMatchObject({
      startsAt: '2026-10-12T22:00:00.000Z', endsAt: '2026-10-13T01:00:00.000Z', startLabel: 'October 12, 2026',
      endLabel: '3:00 PM PDT – 6:00 PM PDT', volunteerRegistrationState: 'open', volunteerCapacity: 25,
      media: event.media, resources: event.resources, outcomes: event.outcomes,
    })
  })

  it('creates new events and rejects an end before the start without submitting', async () => {
    render(<AdminEvents />)
    await screen.findByRole('button', { name: 'Edit' })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New workshop' } })
    fireEvent.change(screen.getByLabelText('Start date and time'), { target: { value: '2026-10-12T18:00' } })
    fireEvent.change(screen.getByLabelText('End date and time'), { target: { value: '2026-10-12T16:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save event' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('End must be after start')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
    fireEvent.change(screen.getByLabelText('End date and time'), { target: { value: '2026-10-12T20:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save event' }))
    await screen.findByText('Event saved.')
    expect(fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')?.[0]).toBe('/api/admin/events')
  })

  it('confirms deletion and clears the editor when its event is deleted', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminEvents />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Workshop' }))
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Workshop' }))
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue(''))
    expect(fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')?.[0]).toBe('/api/admin/events?id=workshop')
  })
})
