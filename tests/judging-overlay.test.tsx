import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import JudgingOverlay from '@/components/judging/JudgingOverlay'

const data = {
  title: 'Pitch night', final: false,
  current: { name: 'Ava', project: 'Robot', average: 40, judges: [{ name: 'Judge 1', total: 40 }, { name: 'Judge 2', total: null }] },
  standings: [{ name: 'Ava', project: 'Robot', average: 40, completed: 1, rank: 1, position: 0 }],
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); window.history.replaceState({}, '', '/') })

function setup(view: string, final = false) {
  window.history.replaceState({}, '', `/judging/overlay?view=${view}#token=test-token`)
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...data, final })))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

describe('OBS views', () => {
  it('shows the current judge screen and sends the token as a bearer header', async () => {
    const fetcher = setup('live')
    render(<JudgingOverlay />)
    expect(await screen.findByRole('heading', { name: 'Ava' })).toBeInTheDocument()
    expect(screen.getByText('Judge 2')).toBeInTheDocument()
    expect(screen.getByText('Waiting')).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledWith('/api/judging/broadcast', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' }, cache: 'no-store' }))
  })

  it('withholds the final standings until scores lock', async () => {
    setup('results')
    render(<JudgingOverlay />)
    expect(await screen.findByText(/Final results will appear/)).toBeInTheDocument()
    expect(screen.queryByText('Ava')).not.toBeInTheDocument()
    cleanup()
    setup('results', true)
    render(<JudgingOverlay />)
    expect(await screen.findByRole('heading', { name: 'Ava' })).toBeInTheDocument()
  })

  it('renders the ticker and a missing-link message', async () => {
    setup('ticker')
    render(<JudgingOverlay />)
    expect(await screen.findByText('LIVE SCORES')).toBeInTheDocument()
    expect(screen.getAllByText(/#1 Ava/)).toHaveLength(2)
    cleanup()
    window.history.replaceState({}, '', '/judging/overlay')
    render(<JudgingOverlay />)
    expect(screen.getByRole('status')).toHaveTextContent('Open an OBS link')
  })

  it('refreshes scores and clears stale results on connection loss', async () => {
    vi.useFakeTimers()
    const fetcher = setup('live')
    fetcher.mockImplementation(async () => new Response(JSON.stringify(data)))
    render(<JudgingOverlay />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByRole('heading', { name: 'Ava' })).toBeInTheDocument()
    fetcher.mockImplementation(async () => new Response(JSON.stringify({ ...data, current: { ...data.current, name: 'Bo' } })))
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(screen.getByRole('heading', { name: 'Bo' })).toBeInTheDocument()
    fetcher.mockRejectedValue(new Error('offline'))
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(screen.queryByRole('heading', { name: 'Bo' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting')
  })
})
