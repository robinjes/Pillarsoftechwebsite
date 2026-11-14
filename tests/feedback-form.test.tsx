import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import FeedbackForm from '@/components/feedback/FeedbackForm'
import type { FeedbackPublicForm } from '@/lib/feedback-contracts'

const form: FeedbackPublicForm = {
  id: '00000000-0000-4000-8000-0000000000f1',
  title: 'Career Panel Feedback',
  intro: 'Thanks for coming!',
  collectContact: true,
  acceptingResponses: true,
  questions: [
    { id: 'q-rating', kind: 'rating', prompt: 'Overall rating?', required: true, options: [] },
    { id: 'q-heard', kind: 'multi_choice', prompt: 'How did you hear?', required: false, options: ['School', 'Friend'] },
    { id: 'q-learn', kind: 'long_text', prompt: 'What did you learn?', required: false, options: [] },
  ],
}

let fetchMock: ReturnType<typeof vi.fn>

// Newer Node versions ship their own localStorage global that can shadow
// jsdom's, so give each test a predictable in-memory store.
function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() { return items.size },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true })
  Element.prototype.scrollIntoView = vi.fn()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/feedback') return new Response(JSON.stringify({ form }))
    return new Response(JSON.stringify({ ok: true }), { status: 201 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('public feedback form', () => {
  it('blocks submission until required questions are answered', async () => {
    render(<FeedbackForm />)
    fireEvent.click(await screen.findByRole('button', { name: /send feedback/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please answer: Overall rating?')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends answers with the device token and shows a thank-you that sticks', async () => {
    render(<FeedbackForm />)
    fireEvent.click(await screen.findByRole('radio', { name: /4 stars/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Friend' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'What did you learn?' }), { target: { value: 'Internships matter' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'sam@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }))

    expect(await screen.findByText('Thank you!')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/feedback/responses')
    expect((init.headers as Record<string, string>)['x-qna-visitor']).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(JSON.parse(String(init.body))).toEqual({
      formId: form.id,
      answers: { 'q-rating': 4, 'q-heard': ['Friend'], 'q-learn': 'Internships matter' },
      email: 'sam@example.com',
    })

    // Reopening the page on the same device shows the thank-you again.
    cleanup()
    render(<FeedbackForm />)
    expect(await screen.findByText(/already have your feedback/i)).toBeInTheDocument()
  })

  it('shows a closed message instead of the form', async () => {
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ form: { ...form, acceptingResponses: false } })))
    render(<FeedbackForm />)
    expect(await screen.findByText('This form is closed')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: /send feedback/i })).not.toBeInTheDocument())
  })
})
