import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import JudgingObsControls from '@/components/judging/JudgingObsControls'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('admin OBS setup', () => {
  it('generates event links and copies the selected view for OBS', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: 'signed-broadcast-token', expiresAt: '2026-11-23T00:00:00Z' })))
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetcher)
    vi.stubGlobal('navigator', Object.create(navigator, { clipboard: { value: { writeText }, configurable: true } }))
    render(<JudgingObsControls eventId="event-a" />)
    fireEvent.click(screen.getByRole('button', { name: 'Generate OBS links' }))
    const ticker = await screen.findByLabelText('Bottom score ticker URL')
    expect(ticker).toHaveValue(`${window.location.origin}/judging/overlay?view=ticker#token=signed-broadcast-token`)
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ eventId: 'event-a' })
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy URL' })[1])
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith((ticker as HTMLInputElement).value)
    expect(screen.getAllByRole('link', { name: /Preview/ })).toHaveLength(3)
  })
})
