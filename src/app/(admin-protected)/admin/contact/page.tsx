'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Mail, RefreshCw } from 'lucide-react'

type ContactStatus = 'new' | 'in_progress' | 'resolved' | 'spam'

type ContactSubmission = {
  id: string
  name: string
  email: string
  subject: string
  schoolName: string
  studentCount: string
  message: string
  status: ContactStatus
  createdAt: string
  updatedAt: string
}

type ContactResponse = {
  submissions?: ContactSubmission[]
  nextCursor?: string | null
  error?: string
}

const statuses: Array<{ value: ContactStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'spam', label: 'Spam' },
]

function statusLabel(status: ContactStatus): string {
  return statuses.find((option) => option.value === status)?.label ?? status
}

export default function AdminContactPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async (cursor?: string) => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({ limit: '25' })
      if (cursor) query.set('cursor', cursor)
      const response = await fetch(`/api/admin/contact?${query.toString()}`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({})) as ContactResponse
      if (!response.ok) throw new Error(result.error || 'Contact submissions could not be loaded.')
      setSubmissions(Array.isArray(result.submissions) ? result.submissions : [])
      setNextCursor(typeof result.nextCursor === 'string' ? result.nextCursor : null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Contact submissions could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateStatus = async (submission: ContactSubmission, status: ContactStatus) => {
    if (status === submission.status || savingId) return
    setSavingId(submission.id)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: submission.id, status }),
      })
      const result = await response.json().catch(() => ({})) as ContactResponse & { submission?: ContactSubmission }
      if (!response.ok || !result.submission) throw new Error(result.error || 'Contact status could not be changed.')
      setSubmissions((current) => current.map((item) => item.id === submission.id ? result.submission as ContactSubmission : item))
      setMessage(`Marked ${statusLabel(status).toLowerCase()}.`)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Contact status could not be changed.')
    } finally {
      setSavingId(null)
    }
  }

  const goNext = () => {
    if (!nextCursor || loading) return
    setCursorHistory((current) => [...current, nextCursor])
    void load(nextCursor)
  }

  const goPrevious = () => {
    if (loading || cursorHistory.length === 0) return
    const history = [...cursorHistory]
    history.pop()
    setCursorHistory(history)
    void load(history[history.length - 1])
  }

  return (
    <section className="max-w-5xl space-y-7 text-ink">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Staff workspace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-midnight sm:text-4xl">Contact inbox</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">Review messages submitted through the protected email form. Keep replies and follow-up in the approved email workflow.</p>
        </div>
        <button
          type="button"
          onClick={() => { setCursorHistory([]); setMessage(''); void load() }}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-midnight px-4 py-2 text-sm font-bold text-midnight transition hover:bg-sky disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {message ? <p role="status" aria-live="polite" className="rounded-2xl border border-green/50 bg-green/20 p-4 text-sm text-midnight">{message}</p> : null}
      {error ? <p role="alert" aria-live="assertive" className="rounded-2xl border border-coral/70 bg-coral/20 p-4 text-sm text-midnight">{error}</p> : null}

      {loading && submissions.length === 0 ? <p className="rounded-2xl border border-dashed border-midnight/25 bg-warm p-8 text-center text-sm text-ink/70">Loading contact messages…</p> : null}
      {!loading && submissions.length === 0 ? <p className="rounded-2xl border border-dashed border-midnight/25 bg-warm p-8 text-center text-sm text-ink/70">No contact messages on this page.</p> : null}

      <div className="space-y-4">
        {submissions.map((submission) => (
          <article key={submission.id} className="rounded-3xl border-2 border-midnight/15 bg-warm p-5 shadow-[5px_5px_0_rgba(13,43,74,0.12)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-midnight/15 pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-cobalt"><Mail className="h-4 w-4" aria-hidden="true" /><h2 className="truncate font-display text-xl font-semibold text-midnight">{submission.subject || 'General inquiry'}</h2></div>
                <p className="mt-2 text-sm font-semibold text-ink">{submission.name} · <a href={`mailto:${submission.email}`} className="text-cobalt underline underline-offset-2">{submission.email}</a></p>
                <p className="mt-1 text-xs text-ink/60"><time dateTime={submission.createdAt}>{new Date(submission.createdAt).toLocaleString()}</time></p>
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-midnight">
                <span className="sr-only">Status for {submission.name}</span>
                <select
                  value={submission.status}
                  onChange={(event) => void updateStatus(submission, event.target.value as ContactStatus)}
                  disabled={savingId === submission.id}
                  className="min-h-11 rounded-full border-2 border-midnight/25 bg-paper px-3 py-2 text-sm font-bold text-midnight outline-none focus-visible:border-cobalt focus-visible:ring-2 focus-visible:ring-sky"
                >
                  {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {savingId === submission.id ? <span role="status" className="text-xs text-ink/60">Saving…</span> : <Check className="h-4 w-4 text-green" aria-hidden="true" />}
              </label>
            </div>
            {submission.schoolName || submission.studentCount ? <p className="mt-4 text-sm text-ink/75">{submission.schoolName || 'School not provided'}{submission.studentCount ? ` · ${submission.studentCount} students` : ''}</p> : null}
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink">{submission.message}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-midnight/15 pt-5">
        <button type="button" onClick={goPrevious} disabled={loading || cursorHistory.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-midnight px-4 py-2 text-sm font-bold text-midnight transition hover:bg-sky disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</button>
        <span className="text-xs font-semibold text-ink/60">Showing up to 25 messages</span>
        <button type="button" onClick={goNext} disabled={loading || !nextCursor} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-midnight px-4 py-2 text-sm font-bold text-midnight transition hover:bg-sky disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">Next<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </section>
  )
}
