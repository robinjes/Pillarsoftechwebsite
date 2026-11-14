'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import QRCode from 'qrcode'
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Lock,
  MonitorPlay,
  Plus,
  Radio,
  RotateCcw,
  Square,
  Star,
  ThumbsUp,
  Unlock,
} from 'lucide-react'

import {
  QNA_TITLE_MAX,
  sortQnaQuestions,
  type QnaAdminQuestion,
  type QnaAdminSession,
  type QnaAdminSnapshot,
  type QnaQuestionStatus,
  type QnaSort,
} from '@/lib/qna-contracts'

import QnaPastSessions from './QnaPastSessions'
import QnaPresenter from './QnaPresenter'
import { timeAgo, usePolling } from './qna-client'

const POLL_MS = 3_000

type Filter = 'live' | 'answered' | 'hidden'

const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 border px-3 text-sm font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
const primaryButton = `${buttonClass} border-midnight bg-midnight text-warm hover:bg-cobalt`
const secondaryButton = `${buttonClass} border-midnight/40 bg-warm text-midnight hover:border-midnight`

async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', body: unknown) {
  const response = await fetch(url, {
    method,
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = (await response.json().catch(() => ({}))) as { error?: string; id?: string }
  if (!response.ok) throw new Error(result.error || 'That change could not be saved.')
  return result
}

export default function QnaHost() {
  const [snapshot, setSnapshot] = useState<QnaAdminSnapshot | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<Filter>('live')
  const [sort, setSort] = useState<QnaSort>('popular')
  const [newTitle, setNewTitle] = useState('')
  const [presenting, setPresenting] = useState(false)
  const [audienceUrl, setAudienceUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    setNow(Date.now())
    try {
      const response = await fetch('/api/admin/qna', { cache: 'no-store' })
      const result = (await response.json().catch(() => ({}))) as QnaAdminSnapshot & { error?: string; message?: string }
      if (!response.ok) throw new Error(result.message || result.error || 'Q&A could not be loaded.')
      setSnapshot(result)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Q&A could not be loaded.')
    }
  }, [])

  usePolling(load, POLL_MS)

  useEffect(() => {
    const url = `${window.location.origin}/qna`
    setAudienceUrl(url)
    void QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 1024, color: { dark: '#0D2B4A', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [])

  const session = snapshot?.sessions.find((item) => item.id === snapshot.currentSessionId) ?? null
  const pastSessions = snapshot?.sessions.filter((item) => item.id !== snapshot.currentSessionId) ?? []
  const questions = session && snapshot ? snapshot.questions : []
  const counts = {
    live: questions.filter((question) => question.status === 'live').length,
    answered: questions.filter((question) => question.status === 'answered').length,
    hidden: questions.filter((question) => question.status === 'hidden').length,
  }
  const visible = sortQnaQuestions(questions.filter((question) => question.status === filter), sort)
  const highlighted = questions.find((question) => question.id === session?.highlightedQuestionId) ?? null

  async function run(action: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await action()
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'That change could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const updateSession = (patch: Record<string, unknown>) =>
    session ? run(() => send('/api/admin/qna', 'PATCH', { sessionId: session.id, ...patch })) : undefined

  const setStatus = (question: QnaAdminQuestion, status: QnaQuestionStatus) =>
    run(() => send('/api/admin/qna/questions', 'PATCH', { questionId: question.id, status }))

  function endSession() {
    if (!session) return
    if (!window.confirm(`End "${session.title}"?\n\nQuestions close, /qna goes back to "not started", and this session moves to Past sessions. You can make it live again later.`)) return
    setPresenting(false)
    void updateSession({ acceptingQuestions: false, highlightedQuestionId: null, isCurrent: false })
  }

  function makeLive(past: QnaAdminSession) {
    const replacing = session ? `\n\n"${session.title}" is live now and will move to Past sessions.` : ''
    if (!window.confirm(`Make "${past.title}" live on /qna again and reopen questions?${replacing}`)) return
    void run(() => send('/api/admin/qna', 'PATCH', { sessionId: past.id, isCurrent: true, acceptingQuestions: true }))
  }

  function deleteSession(past: QnaAdminSession) {
    const count = `${past.questionCount} ${past.questionCount === 1 ? 'question' : 'questions'}`
    if (!window.confirm(`Permanently delete "${past.title}" and its ${count}?\n\nThis cannot be undone.`)) return
    void run(() => send('/api/admin/qna', 'DELETE', { sessionId: past.id }))
  }

  function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    if (session && !window.confirm(`Start "${title}"?\n\n"${session.title}" is live now and will move to Past sessions.`)) return
    void run(async () => {
      await send('/api/admin/qna', 'POST', { title, makeCurrent: true })
      setNewTitle('')
    })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(audienceUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      setError('Copy failed. Select the link and copy it manually.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Unlisted page · /qna</p>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] text-midnight sm:text-4xl">Live Q&amp;A</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-ink/70">
            Questions post instantly. Hide anything inappropriate, highlight the one the panel is answering, and mark it answered when done.
          </p>
        </div>
        <button type="button" className={primaryButton} onClick={() => setPresenting(true)} disabled={!session}>
          <MonitorPlay className="h-4 w-4" aria-hidden="true" /> Presenter screen
        </button>
      </header>

      {error ? <p role="alert" className="border border-red-800/40 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="border border-midnight/25 bg-warm p-5" aria-labelledby="qna-session-heading">
          <h2 id="qna-session-heading" className="font-display text-lg font-semibold text-midnight">Live session</h2>

          {!snapshot ? <p className="mt-2 text-sm text-ink/70">Loading…</p> : null}

          {snapshot && session ? (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-midnight">{session.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 border border-green-800/40 bg-green-50 px-2 py-0.5 font-bold text-green-900">
                    <Radio className="h-3.5 w-3.5" aria-hidden="true" /> Live on /qna
                  </span>
                  <span className={`border px-2 py-0.5 font-bold ${session.acceptingQuestions ? 'border-midnight/30 text-midnight' : 'border-red-800/40 bg-red-50 text-red-900'}`}>
                    {session.acceptingQuestions ? 'Questions open' : 'Questions closed'}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {session.acceptingQuestions ? (
                  <button type="button" className={secondaryButton} disabled={busy} onClick={() => updateSession({ acceptingQuestions: false })}>
                    <Lock className="h-4 w-4" aria-hidden="true" /> Close questions
                  </button>
                ) : (
                  <button type="button" className={secondaryButton} disabled={busy} onClick={() => updateSession({ acceptingQuestions: true })}>
                    <Unlock className="h-4 w-4" aria-hidden="true" /> Reopen questions
                  </button>
                )}
                <button type="button" className={`${secondaryButton} border-red-900/50 text-red-900 hover:border-red-900`} disabled={busy} onClick={endSession}>
                  <Square className="h-4 w-4" aria-hidden="true" /> End session
                </button>
              </div>
            </div>
          ) : null}

          {snapshot && !session ? (
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Nothing is live. Anyone opening /qna sees &ldquo;not started yet&rdquo;. Start a new session below, or make a past one live again.
            </p>
          ) : null}

          <form onSubmit={createSession} className="mt-5 flex flex-col gap-2 border-t border-midnight/15 pt-4 sm:flex-row">
            <label htmlFor="qna-new-session" className="sr-only">New session title</label>
            <input
              id="qna-new-session"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              maxLength={QNA_TITLE_MAX}
              placeholder="New session title, e.g. Career Panel 2026"
              className="min-h-10 flex-1 border border-midnight/30 bg-white/70 px-3 text-base"
            />
            <button type="submit" className={session ? secondaryButton : primaryButton} disabled={busy || !newTitle.trim()}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Create and go live
            </button>
          </form>
        </section>

        <aside className="border border-midnight/25 bg-warm p-5" aria-labelledby="qna-share-heading">
          <h2 id="qna-share-heading" className="font-display text-lg font-semibold text-midnight">Audience link</h2>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL generated in the browser
            <img src={qrDataUrl} alt={`QR code for ${audienceUrl}`} width={200} height={200} className="mx-auto mt-3 h-48 w-48 border border-midnight/20 bg-white" />
          ) : null}
          <p className="mt-3 break-all text-center font-mono text-sm text-ink/80">{audienceUrl}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className={secondaryButton} onClick={copyLink}>
              <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
            </button>
            {qrDataUrl ? (
              <a className={secondaryButton} href={qrDataUrl} download="pillars-of-tech-qna-qr.png">
                <Download className="h-4 w-4" aria-hidden="true" /> QR PNG
              </a>
            ) : null}
          </div>
        </aside>
      </div>

      {session ? (
        <section aria-labelledby="qna-questions-heading" className="flex flex-col gap-4">
          {highlighted ? (
            <div className="border-2 border-midnight bg-sky p-4">
              <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-midnight">On screen now</p>
              <p className="mt-1 text-lg text-ink">{highlighted.body}</p>
              <button type="button" className={`${secondaryButton} mt-3`} disabled={busy} onClick={() => updateSession({ highlightedQuestionId: null })}>
                Clear highlight
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="qna-questions-heading" className="font-display text-xl font-semibold text-midnight">Questions</h2>
            <div className="flex flex-wrap gap-2">
              <div className="flex border border-midnight/30 bg-warm" role="group" aria-label="Filter">
                {(['live', 'answered', 'hidden'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                    className={`min-h-10 px-3 text-sm font-bold capitalize ${filter === value ? 'bg-midnight text-warm' : 'text-midnight hover:bg-white/60'}`}
                  >
                    {value} ({counts[value]})
                  </button>
                ))}
              </div>
              <div className="flex border border-midnight/30 bg-warm" role="group" aria-label="Sort">
                {(['popular', 'recent'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={sort === value}
                    onClick={() => setSort(value)}
                    className={`min-h-10 px-3 text-sm font-bold capitalize ${sort === value ? 'bg-midnight text-warm' : 'text-midnight hover:bg-white/60'}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {visible.map((question) => (
              <li key={question.id} className={`border bg-warm p-4 ${question.id === highlighted?.id ? 'border-2 border-midnight' : 'border-midnight/20'}`}>
                <div className="flex gap-4">
                  <div className="flex min-w-12 flex-col items-center justify-start text-midnight" aria-label={`${question.upvotes} votes`}>
                    <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                    <span className="text-lg font-bold">{question.upvotes}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink/65">
                      <span className="font-semibold text-ink/85">{question.authorName || 'Anonymous'}</span> · {timeAgo(question.createdAt, now)}
                    </p>
                    <p className="mt-1 whitespace-pre-line break-words text-base text-ink">{question.body}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.status !== 'hidden' && question.id !== highlighted?.id ? (
                        <button type="button" className={secondaryButton} disabled={busy} onClick={() => updateSession({ highlightedQuestionId: question.id })}>
                          <Star className="h-4 w-4" aria-hidden="true" /> Highlight
                        </button>
                      ) : null}
                      {question.status === 'live' ? (
                        <button type="button" className={secondaryButton} disabled={busy} onClick={() => setStatus(question, 'answered')}>
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Mark answered
                        </button>
                      ) : null}
                      {question.status === 'answered' ? (
                        <button type="button" className={secondaryButton} disabled={busy} onClick={() => setStatus(question, 'live')}>
                          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reopen
                        </button>
                      ) : null}
                      {question.status === 'hidden' ? (
                        <button type="button" className={secondaryButton} disabled={busy} onClick={() => setStatus(question, 'live')}>
                          <Eye className="h-4 w-4" aria-hidden="true" /> Restore
                        </button>
                      ) : (
                        <button type="button" className={`${secondaryButton} text-red-900`} disabled={busy} onClick={() => setStatus(question, 'hidden')}>
                          <EyeOff className="h-4 w-4" aria-hidden="true" /> Hide
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {visible.length === 0 ? (
            <p className="border border-dashed border-midnight/30 p-6 text-center text-ink/65">No {filter} questions.</p>
          ) : null}
        </section>
      ) : null}

      {snapshot ? (
        <QnaPastSessions
          sessions={pastSessions}
          busy={busy}
          buttonClass={secondaryButton}
          onMakeLive={makeLive}
          onDelete={deleteSession}
        />
      ) : null}

      {presenting && session ? (
        <QnaPresenter
          title={session.title}
          question={highlighted}
          audienceUrl={audienceUrl}
          qrDataUrl={qrDataUrl}
          totalQuestions={counts.live + counts.answered}
          onClose={() => setPresenting(false)}
        />
      ) : null}
    </div>
  )
}
