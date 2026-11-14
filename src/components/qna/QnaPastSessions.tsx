'use client'

import { useState } from 'react'
import { ChevronDown, Download, Radio, ThumbsUp, Trash2 } from 'lucide-react'

import { sortQnaQuestions, type QnaAdminQuestion, type QnaAdminSession } from '@/lib/qna-contracts'

type Props = {
  sessions: QnaAdminSession[]
  busy: boolean
  buttonClass: string
  onMakeLive: (session: QnaAdminSession) => void
  onDelete: (session: QnaAdminSession) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadCsv(session: QnaAdminSession, questions: QnaAdminQuestion[]) {
  const rows = [
    ['Question', 'Name', 'Upvotes', 'Status', 'Asked at'],
    ...sortQnaQuestions(questions, 'popular').map((q) => [q.body, q.authorName || 'Anonymous', q.upvotes, q.status, q.createdAt]),
  ]
  const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${session.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'qna'}-questions.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const statusLabel: Record<QnaAdminQuestion['status'], string> = { live: 'Not answered', answered: 'Answered', hidden: 'Hidden' }

function PastSession({ session, busy, buttonClass, onMakeLive, onDelete }: Omit<Props, 'sessions'> & { session: QnaAdminSession }) {
  const [open, setOpen] = useState(false)
  const [questions, setQuestions] = useState<QnaAdminQuestion[] | null>(null)
  const [error, setError] = useState('')

  async function toggle() {
    const next = !open
    setOpen(next)
    if (!next || questions) return
    setError('')
    try {
      const response = await fetch(`/api/admin/qna/questions?sessionId=${encodeURIComponent(session.id)}`, { cache: 'no-store' })
      const result = (await response.json().catch(() => ({}))) as { questions?: QnaAdminQuestion[]; error?: string }
      if (!response.ok || !result.questions) throw new Error(result.error || 'Questions could not be loaded.')
      setQuestions(result.questions)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Questions could not be loaded.')
    }
  }

  return (
    <li className="border border-midnight/20 bg-warm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky"
        >
          <ChevronDown className={`h-5 w-5 shrink-0 text-midnight transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold text-midnight">{session.title}</span>
            <span className="block text-sm text-ink/65">
              {formatDate(session.createdAt)} · {session.questionCount} {session.questionCount === 1 ? 'question' : 'questions'}
            </span>
          </span>
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} disabled={busy} onClick={() => onMakeLive(session)}>
            <Radio className="h-4 w-4" aria-hidden="true" /> Make live again
          </button>
          <button type="button" className={`${buttonClass} text-red-900`} disabled={busy} onClick={() => onDelete(session)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-midnight/15 p-4">
          {error ? <p role="alert" className="text-sm text-red-900">{error}</p> : null}
          {!error && !questions ? <p role="status" className="text-sm text-ink/65">Loading questions…</p> : null}
          {questions && questions.length === 0 ? <p className="text-sm text-ink/65">No questions were asked in this session.</p> : null}
          {questions && questions.length > 0 ? (
            <>
              <div className="mb-3 flex justify-end">
                <button type="button" className={buttonClass} onClick={() => downloadCsv(session, questions)}>
                  <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
                </button>
              </div>
              <ol className="flex flex-col gap-2">
                {sortQnaQuestions(questions, 'popular').map((question) => (
                  <li key={question.id} className={`flex gap-3 border border-midnight/10 bg-white/50 p-3 ${question.status === 'hidden' ? 'opacity-60' : ''}`}>
                    <span className="flex min-w-10 flex-col items-center text-midnight" aria-label={`${question.upvotes} votes`}>
                      <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                      <span className="font-bold">{question.upvotes}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink/65">
                        <span className="font-semibold text-ink/85">{question.authorName || 'Anonymous'}</span> · {statusLabel[question.status]}
                      </span>
                      <span className="mt-0.5 block whitespace-pre-line break-words text-ink">{question.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

/** Collapsible history of ended sessions, newest first. */
export default function QnaPastSessions({ sessions, ...rest }: Props) {
  return (
    <details className="group border border-midnight/25 bg-cream/40">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-warm px-5 py-3 font-display text-lg font-semibold text-midnight focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky [&::-webkit-details-marker]:hidden">
        <span>Past sessions ({sessions.length})</span>
        <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="p-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-ink/65">Sessions you end will appear here.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((session) => (
              <PastSession key={session.id} session={session} {...rest} />
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}
