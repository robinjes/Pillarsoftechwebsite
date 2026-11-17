import { act } from 'react'
import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import JudgingApp from '@/components/judging/JudgingApp'
import { readJudgeDrafts, readLastJudgeState } from '@/lib/judging-local'
import type { JudgeState } from '@/lib/judging-contracts'

const student = { id: '00000000-0000-4000-8000-0000000000c1', name: 'Jay', project: 'Robot' }
let state: JudgeState
let offline: boolean
let fetcher: ReturnType<typeof vi.fn>
let scoreStatus: number
let authenticated: boolean
let holdSave: (() => Promise<Response>) | null
let holdState: (() => Promise<Response>) | null
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
const choose = (number: number) => fireEvent.click(within(screen.getByRole('radiogroup', { name: /problem \+ usefulness/i })).getByRole('radio', { name: String(number) }))
const saves = () => fetcher.mock.calls.filter(([url]) => url === '/api/judging/scores')
const poll = async () => { await act(async () => { window.dispatchEvent(new Event('focus')) }) }

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  offline = false; scoreStatus = 200; authenticated = true; holdSave = null; holdState = null
  state = { judge: { id: '00000000-0000-4000-8000-0000000000d1', name: 'Judge One' }, event: { id: '00000000-0000-4000-8000-0000000000e1', title: 'Pitch night', scoresLocked: false }, currentContestantId: student.id, contestants: [student], scores: [] }
  fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (offline) throw new Error('No network')
    if (url === '/api/judging/state') return holdState ? holdState() : authenticated ? response(state) : response({ error: 'signed_out' }, 401)
    if (url === '/api/judging/session') { authenticated = true; return response({ ok: true }) }
    if (url === '/api/judging/scores') {
      if (holdSave) return holdSave()
      if (scoreStatus !== 200) return response(scoreStatus === 409 ? { locked: true } : { error: 'removed' }, scoreStatus)
      const { session: _session, ...input } = JSON.parse(String(init?.body))
      const score = { ...input, updatedAt: new Date().toISOString() }
      state = { ...state, scores: [score] }
      return response({ score })
    }
    return response({})
  })
  vi.stubGlobal('fetch', fetcher)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear() })

describe('judge offline backup and reconnection', () => {
  it('backs up every edit immediately, restores after remount offline, and syncs on reconnection', async () => {
    const view = render(<JudgingApp />)
    await flush()
    offline = true
    choose(8)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Strong prototype' } })
    // Even before the comment debounce or network promise runs, the data is durable.
    expect(readJudgeDrafts(state, false)[student.id]).toMatchObject({ pending: true, value: { problem: 8, comment: 'Strong prototype' } })
    await flush(800)
    view.unmount()
    render(<JudgingApp />)
    await flush()
    expect(screen.getByRole('heading', { name: 'Jay' })).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Strong prototype')
    expect(within(screen.getByRole('radiogroup', { name: /problem \+ usefulness/i })).getByRole('radio', { name: '8' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Offline \/ reconnecting/)).toBeInTheDocument()
    offline = false
    await act(async () => { window.dispatchEvent(new Event('online')) })
    await flush()
    expect(state.scores[0]).toMatchObject({ problem: 8, comment: 'Strong prototype' })
    expect(readJudgeDrafts(state, false)[student.id].pending).toBe(false)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(JSON.parse(saves().at(-1)![1].body).session).toEqual({ judgeId: state.judge.id, eventId: state.event.id })
  })

  it('serializes saves and sends the newest edit after an older in-flight save', async () => {
    render(<JudgingApp />); await flush()
    let finish!: (result: Response) => void
    holdSave = () => new Promise<Response>((resolve) => { finish = resolve })
    choose(7); await flush()
    choose(9); await flush()
    expect(saves()).toHaveLength(1)
    const old = JSON.parse(saves()[0][1].body)
    holdSave = null
    await act(async () => { finish(response({ score: { ...old, updatedAt: '' } })) })
    await flush()
    expect(saves()).toHaveLength(2)
    expect(JSON.parse(saves()[1][1].body).problem).toBe(9)
    expect(readJudgeDrafts(state, false)[student.id]).toMatchObject({ pending: false, value: { problem: 9 } })
  })

  it('does not let a stale poll overwrite a newly confirmed score', async () => {
    render(<JudgingApp />); await flush()
    const stale = { ...state, scores: [{ contestantId: student.id, problem: 2, creativity: null, stem: null, design: null, pitch: null, comment: '', updatedAt: '' }] }
    let finish!: (value: Response) => void
    holdState = () => new Promise<Response>((resolve) => { finish = resolve })
    await poll()
    choose(9); await flush()
    await act(async () => { finish(response(stale)) })
    expect(within(screen.getByRole('radiogroup', { name: /problem \+ usefulness/i })).getByRole('radio', { name: '9' })).toHaveAttribute('aria-checked', 'true')
  })

  it('retains queued edits when scores lock, then retries after the host unlocks', async () => {
    render(<JudgingApp />); await flush()
    scoreStatus = 409
    choose(8); await flush()
    expect(readJudgeDrafts(state, false)[student.id].pending).toBe(true)
    expect(screen.getByText(/Not synced: scores locked/)).toBeInTheDocument()
    state = { ...state, event: { ...state.event, scoresLocked: true } }
    await poll()
    const count = saves().length
    await poll()
    expect(saves()).toHaveLength(count)
    scoreStatus = 200
    state = { ...state, event: { ...state.event, scoresLocked: false } }
    await poll(); await flush()
    expect(readJudgeDrafts(state, false)[student.id].pending).toBe(false)
  })

  it('keeps removed-student drafts and offers an export after the event/session ends', async () => {
    const view = render(<JudgingApp />); await flush()
    scoreStatus = 404
    choose(8)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this feedback' } })
    await flush(800)
    expect(readJudgeDrafts(state, false)[student.id].pending).toBe(true)
    view.unmount()
    authenticated = false
    render(<JudgingApp />); await flush()
    expect(screen.getByRole('heading', { name: 'Judge sign-in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download score backup' })).toBeInTheDocument()
    expect(screen.getByText(/waiting to sync/)).toBeInTheDocument()
    const create = vi.fn(() => 'blob:local-backup')
    vi.stubGlobal('Blob', NodeBlob)
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: create, revokeObjectURL: vi.fn() }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Download score backup' }))
    const exported = JSON.parse(await (create.mock.calls[0] as unknown as [NodeBlob])[0].text())
    expect(exported.scores[0]).toMatchObject({ problem: 8, comment: 'Keep this feedback', waitingToSync: true, student: { name: 'Jay' } })
    expect(JSON.stringify(exported)).not.toContain('session')
  })

  it('keeps pending drafts separate when a different judge signs in', async () => {
    render(<JudgingApp />); await flush()
    const original = structuredClone(state)
    offline = true; choose(9); await flush()
    state = { ...state, judge: { id: '00000000-0000-4000-8000-0000000000d2', name: 'Judge Two' } }
    offline = false
    const count = saves().length
    await poll()
    expect(saves()).toHaveLength(count)
    expect(screen.getByText('Judge: Judge Two')).toBeInTheDocument()
    expect(readJudgeDrafts(original, false)[student.id].pending).toBe(true)
    expect(readJudgeDrafts(state, false)).toEqual({})
  })

  it('shows a storage warning while keeping the in-memory draft usable', async () => {
    render(<JudgingApp />); await flush()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    offline = true; choose(8); await flush()
    expect(screen.getByRole('alert')).toHaveTextContent('Local backup is unavailable')
    expect(screen.getByRole('button', { name: 'Download score backup' })).toBeEnabled()
  })

  it('does not mark a draft synced when a portal or bad response returns 200 without a saved score', async () => {
    render(<JudgingApp />); await flush()
    holdSave = async () => new Response('<html>Sign in to Wi-Fi</html>')
    choose(8); await flush()
    expect(readJudgeDrafts(state, false)[student.id].pending).toBe(true)
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('never stores judge access codes, cookies, or the live timer in its cached snapshot', async () => {
    render(<JudgingApp />); await flush()
    expect(readLastJudgeState(false)?.judge.name).toBe('Judge One')
    const saved = Array.from({ length: localStorage.length }, (_, index) => localStorage.getItem(localStorage.key(index)!)).join('')
    expect(saved).not.toContain('accessCode')
    expect(saved).not.toContain('cookie')
    expect(readLastJudgeState(true)).toBeNull()
  })
})
