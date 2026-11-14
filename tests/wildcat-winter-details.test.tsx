import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import WildcatWinterDetails from '@/components/WildcatWinterDetails'
import { wildcatWinterDescription } from '@/data/wildcat-winter'
import { getPublicEventSnapshotById } from '@/lib/event-snapshot'
import { publicEventPath } from '@/lib/event-path'

describe('Wildcat Tank winter event details', () => {
  it('keeps the event record, share URL, and detailed guide in sync', () => {
    const event = getPublicEventSnapshotById('wildcat-tank-pt-2')!
    expect(event.description).toBe(wildcatWinterDescription)
    expect(publicEventPath(event)).toBe('/wildcattankwinter')
    expect(event.date).toBe('December 2, 2026')
    expect(event.location).toContain('confirmation pending')
  })

  it('shows both tracks, presentation choices, deadlines, scoring, and family guidance', () => {
    render(<WildcatWinterDetails />)
    expect(screen.getByText(/25 participants per track and 50 total/)).toBeInTheDocument()
    expect(screen.getByText(/Any presentation format is welcome: a board, slides, drawings/)).toBeInTheDocument()
    expect(screen.getByText(/1–2 weeks before the event/)).toBeInTheDocument()
    expect(screen.getByText(/Group size details will be shared/, { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See last spring’s pitches and scores' })).toHaveAttribute('href', '/wildcat-tank')
    const tables = screen.getAllByRole('table')
    expect(within(tables[0]).getByText(/Reply YES to confirm/)).toBeInTheDocument()
    expect(within(tables[0]).getByText(/Slides are optional/)).toBeInTheDocument()
    expect(within(tables[1]).getAllByRole('row')).toHaveLength(6)
    expect(screen.getByText(/Everyone must check in by 5:50 PM/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Parent FAQ' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'pillarsoftech@gmail.com' })).toHaveAttribute('href', 'mailto:pillarsoftech@gmail.com')
    expect(document.body.textContent).not.toContain('[CONFIRM')
    expect(document.body.textContent).not.toContain('28 presenters')
  })
})
