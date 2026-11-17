import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import JudgingAudience from '@/components/judging/JudgingAudience'
import JudgingAudienceControls from '@/components/judging/JudgingAudienceControls'
import type { JudgingAdminEvent } from '@/lib/judging-contracts'
import type { JudgingAudienceState } from '@/lib/judging-audience'

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,demo') } }))

const initial: JudgingAudienceState = { title: 'Pitch night', isLive: true, awardsMessage: 'Awards after presentations', presentationNumber: 1, totalPresentations: 2, current: { name: 'Alex', project: 'Robot' }, next: { name: 'Maya', project: 'Solar' }, resultsReleased: false, results: null }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); window.history.replaceState({}, '', '/') })

describe('family event page', () => {
  it('shows progress and the hold message, then reveals everyone together and clears withdrawn results', async () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/judging/demo/families?eventId=test-event')
    let data = initial
    const fetcher = vi.fn(async () => new Response(JSON.stringify(data)))
    vi.stubGlobal('fetch', fetcher)
    render(<JudgingAudience demo />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByRole('heading', { name: 'Scores coming after awards' })).toBeInTheDocument()
    expect(screen.getByText('Presentation 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Maya')).toBeInTheDocument()
    expect(screen.queryByText(/40.0/)).not.toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledWith('/api/dev/judging/audience?eventId=test-event', expect.objectContaining({ cache: 'no-store' }))
    data = { ...initial, resultsReleased: true, results: [{ name: 'Alex', project: 'Robot', average: 40, rank: 1 }, { name: 'Maya', project: 'Solar', average: 45, rank: 2 }] }
    await act(async () => { await vi.advanceTimersByTimeAsync(4_000) })
    expect(screen.getByRole('heading', { name: 'Final results' })).toBeInTheDocument()
    expect(screen.getByText('40.0 / 50')).toBeInTheDocument()
    expect(screen.getByText('45.0 / 50')).toBeInTheDocument()
    data = initial
    await act(async () => { await vi.advanceTimersByTimeAsync(4_000) })
    expect(screen.queryByText('40.0 / 50')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Scores coming after awards' })).toBeInTheDocument()
  })

  it('asks for the event link when none is provided', () => {
    render(<JudgingAudience />)
    expect(screen.getByRole('status')).toHaveTextContent('Scan the event QR code')
  })
})

describe('parent QR and release controls', () => {
  it('builds the family QR link, requires locked scores and confirms publication', async () => {
    const onChange = vi.fn(async () => {})
    const fetcher = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetcher)
    const event: JudgingAdminEvent = { id: 'event-a', title: 'Pitch night', isCurrent: true, scoresLocked: false, currentContestantId: null, createdAt: '', contestantCount: 2, judgeCount: 2 }
    const { rerender } = render(<JudgingAudienceControls event={event} demo onChange={onChange} />)
    expect(await screen.findByAltText('QR code for the parent event page')).toBeInTheDocument()
    expect(screen.getByLabelText('Parent event link')).toHaveValue(`${window.location.origin}/judging/demo/families?eventId=event-a`)
    expect(screen.getByRole('button', { name: 'Release all results to families' })).toBeDisabled()
    rerender(<JudgingAudienceControls event={{ ...event, scoresLocked: true }} demo onChange={onChange} />)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Release all results to families' }))
    expect(fetcher).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Release all results to families' }))
    expect(await screen.findByRole('status')).toHaveTextContent('All results are now visible')
    expect(fetcher).toHaveBeenCalledWith('/api/dev/judging/host/audience', expect.objectContaining({ method: 'POST', body: JSON.stringify({ eventId: 'event-a', resultsReleased: true }) }))
    expect(onChange).toHaveBeenCalledOnce()
  })
})
