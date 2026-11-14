import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,AA==') } }))

import QnaHost from '@/components/qna/QnaHost'
import type { QnaAdminSnapshot } from '@/lib/qna-contracts'

const live = {
  id: '00000000-0000-4000-8000-0000000000a1',
  title: 'Career Panel 2026',
  isCurrent: true,
  acceptingQuestions: true,
  highlightedQuestionId: null,
  createdAt: '2026-10-24T17:00:00Z',
  questionCount: 1,
}
const past = { ...live, id: '00000000-0000-4000-8000-0000000000a2', title: 'career panel test', isCurrent: false, questionCount: 2 }
const snapshot: QnaAdminSnapshot = {
  sessions: [live, past],
  currentSessionId: live.id,
  questions: [{ id: '00000000-0000-4000-8000-0000000000b1', body: 'How did you start?', authorName: null, upvotes: 3, status: 'live', createdAt: '2026-10-24T17:05:00Z' }],
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/admin/qna' && !init?.method) return new Response(JSON.stringify(snapshot))
    if (url.startsWith('/api/admin/qna/questions?sessionId=')) {
      return new Response(JSON.stringify({ questions: [
        { id: 'q1', body: 'Old question one', authorName: 'Sam', upvotes: 9, status: 'answered', createdAt: '2026-10-23T17:00:00Z' },
        { id: 'q2', body: 'Old question two', authorName: null, upvotes: 1, status: 'hidden', createdAt: '2026-10-23T17:01:00Z' },
      ] }))
    }
    return new Response(JSON.stringify({ ok: true }))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function calls(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method).map(([url, init]) => ({ url, body: JSON.parse(String(init?.body)) }))
}

describe('Q&A host page', () => {
  it('ends the live session after confirming, closing questions and clearing the highlight', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<QnaHost />)
    fireEvent.click(await screen.findByRole('button', { name: /end session/i }))

    await waitFor(() => expect(calls('PATCH')).toHaveLength(1))
    expect(calls('PATCH')[0]).toEqual({
      url: '/api/admin/qna',
      body: { sessionId: live.id, acceptingQuestions: false, highlightedQuestionId: null, isCurrent: false },
    })
  })

  it('does nothing when ending is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<QnaHost />)
    fireEvent.click(await screen.findByRole('button', { name: /end session/i }))
    expect(calls('PATCH')).toHaveLength(0)
  })

  it('lists past sessions, shows their questions, and deletes after confirming', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<QnaHost />)

    expect(await screen.findByText('Past sessions (1)')).toBeInTheDocument()
    const pastItem = screen.getByText('career panel test').closest('li') as HTMLElement
    expect(within(pastItem).getByText(/2 questions/)).toBeInTheDocument()

    fireEvent.click(within(pastItem).getByRole('button', { expanded: false }))
    expect(await within(pastItem).findByText('Old question one')).toBeInTheDocument()
    expect(within(pastItem).getByText(/Answered/)).toBeInTheDocument()
    expect(within(pastItem).getByText(/Hidden/)).toBeInTheDocument()

    fireEvent.click(within(pastItem).getByRole('button', { name: /delete/i }))
    expect(confirm.mock.calls.at(-1)?.[0]).toContain('cannot be undone')
    await waitFor(() => expect(calls('DELETE')).toEqual([{ url: '/api/admin/qna', body: { sessionId: past.id } }]))
  })
})
