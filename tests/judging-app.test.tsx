import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import JudgingApp from '@/components/judging/JudgingApp'
import type { JudgeState } from '@/lib/judging-contracts'

const jay = { id: '00000000-0000-4000-8000-0000000000c1', name: 'Jay', project: 'Solar backpack' }
const maya = { id: '00000000-0000-4000-8000-0000000000c2', name: 'Maya', project: 'Recycling robot' }

let serverState: JudgeState
let signedIn: boolean
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  signedIn = true
  serverState = {
    judge: { id: 'judge-1', name: 'Ms. Patel' },
    event: { id: 'event-1', title: 'Wildcat Tank', scoresLocked: false },
    currentContestantId: jay.id,
    contestants: [jay, maya],
    scores: [],
  }
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/judging/state') {
      return signedIn ? new Response(JSON.stringify(serverState)) : new Response(JSON.stringify({ error: 'signed_out' }), { status: 401 })
    }
    if (url === '/api/judging/session' && init?.method === 'POST') {
      signedIn = JSON.parse(String(init.body)).code === 'K7P4QM'
      return signedIn ? new Response(JSON.stringify({ ok: true })) : new Response(JSON.stringify({ error: 'That code didn’t work.' }), { status: 401 })
    }
    if (url === '/api/judging/scores') {
      const body = JSON.parse(String(init?.body))
      const score = { ...body, updatedAt: new Date().toISOString() }
      serverState = { ...serverState, scores: [...serverState.scores.filter((item) => item.contestantId !== body.contestantId), score] }
      return new Response(JSON.stringify({ score }))
    }
    return new Response('{}')
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// The page polls on an interval and also refreshes when the window regains
// focus; focus gives the test a deterministic "next poll".
async function poll() {
  await act(async () => {
    window.dispatchEvent(new Event('focus'))
  })
}

describe('judge screen', () => {
  it('signs in with a code', async () => {
    signedIn = false
    render(<JudgingApp />)
    const input = await screen.findByLabelText('Judge code')
    fireEvent.change(input, { target: { value: 'k7p4qm' } })
    fireEvent.click(screen.getByRole('button', { name: /start judging/i }))
    expect(await screen.findByRole('heading', { name: 'Jay' })).toBeInTheDocument()
  })

  it('opens the current student, autosaves scores, and follows the host to the next student', async () => {
    render(<JudgingApp />)
    expect(await screen.findByRole('heading', { name: 'Jay' })).toBeInTheDocument()

    const problem = screen.getByRole('radiogroup', { name: /problem \+ usefulness/i })
    fireEvent.click(within(problem).getByRole('radio', { name: '8' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/judging/scores')).toBe(true))
    const saved = JSON.parse(String(fetchMock.mock.calls.find(([url]) => url === '/api/judging/scores')?.[1]?.body))
    expect(saved).toMatchObject({ contestantId: jay.id, problem: 8, creativity: null })
    expect(await screen.findByText('Saved')).toBeInTheDocument()

    // The host moves everyone to Maya.
    serverState = { ...serverState, currentContestantId: maya.id }
    await poll()
    expect(await screen.findByRole('heading', { name: 'Maya' })).toBeInTheDocument()
    expect(screen.getByText('Now judging Maya')).toBeInTheDocument()

    // Home shows Maya as current and Jay in the judge's recent scores.
    fireEvent.click(screen.getAllByRole('button', { name: /home/i })[0])
    const yourScores = screen.getByRole('heading', { name: 'Your scores' }).parentElement as HTMLElement
    expect(within(yourScores).getByText('Jay')).toBeInTheDocument()
    expect(within(yourScores).getByText('8')).toBeInTheDocument()

    // Reopen Jay to fix a score, then jump back to the current student.
    fireEvent.click(within(yourScores).getByRole('button', { name: /jay/i }))
    expect(await screen.findByText('Reviewing your score')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /now judging: maya/i }))
    expect(await screen.findByRole('heading', { name: 'Maya' })).toBeInTheDocument()
  })

  it('shows locked scores read-only', async () => {
    serverState = { ...serverState, event: { ...serverState.event, scoresLocked: true } }
    render(<JudgingApp />)
    expect(await screen.findByText(/scores are locked/i)).toBeInTheDocument()
    const problem = screen.getByRole('radiogroup', { name: /problem \+ usefulness/i })
    expect(within(problem).getByRole('radio', { name: '5' })).toBeDisabled()
  })
})
