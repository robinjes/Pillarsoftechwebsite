'use client'

import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, MessageCircleQuestion, Send, ThumbsUp } from 'lucide-react'

import {
  QNA_NAME_MAX,
  QNA_QUESTION_MAX,
  QNA_QUESTION_MIN,
  QNA_UPVOTES_STORAGE_KEY,
  QNA_VISITOR_HEADER,
  sortQnaQuestions,
  type QnaPublicQuestion,
  type QnaPublicSnapshot,
} from '@/lib/qna-contracts'

import { getVisitorToken, readStoredJson, timeAgo, usePolling, writeStoredJson } from './qna-client'

const POLL_MS = 4_000
const PENDING_VOTE_MS = 8_000
const NAME_STORAGE_KEY = 'pot-qna-name'

type Tab = 'popular' | 'recent' | 'answered'
type PendingVote = { upvotes: number; until: number }

export default function QnaAudience() {
  const [snapshot, setSnapshot] = useState<QnaPublicSnapshot | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<Tab>('popular')
  const [now, setNow] = useState(() => Date.now())
  const [upvoted, setUpvoted] = useState<Record<string, true>>(() =>
    typeof window === 'undefined' ? {} : readStoredJson(QNA_UPVOTES_STORAGE_KEY, {}),
  )
  const [pendingVotes, setPendingVotes] = useState<Record<string, PendingVote>>({})
  const [ownQuestions, setOwnQuestions] = useState<QnaPublicQuestion[]>([])

  const [body, setBody] = useState('')
  const [name, setName] = useState(() => (typeof window === 'undefined' ? '' : readStoredJson(NAME_STORAGE_KEY, '')))
  const [sending, setSending] = useState(false)
  const [formMessage, setFormMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [voteError, setVoteError] = useState('')

  const load = useCallback(async () => {
    setNow(Date.now())
    try {
      const response = await fetch('/api/qna', { headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error('unavailable')
      const next = (await response.json()) as QnaPublicSnapshot
      setSnapshot(next)
      setLoadError(false)
      // Keep a just-sent question visible until the shared cache catches up.
      setOwnQuestions((own) => own.filter((question) => !next.questions.some((item) => item.id === question.id)))
    } catch {
      setLoadError(true)
    }
  }, [])

  usePolling(load, POLL_MS)

  const questions = useMemo(() => {
    if (!snapshot) return []
    const merged = [...ownQuestions.filter((own) => !snapshot.questions.some((item) => item.id === own.id)), ...snapshot.questions]
    return merged.map((question) => {
      const pending = pendingVotes[question.id]
      return pending && pending.until > now ? { ...question, upvotes: pending.upvotes } : question
    })
  }, [snapshot, ownQuestions, pendingVotes, now])

  const highlighted = snapshot?.session?.highlightedQuestionId
    ? questions.find((question) => question.id === snapshot.session?.highlightedQuestionId) ?? null
    : null
  const open = questions.filter((question) => !question.answered && question.id !== highlighted?.id)
  const answered = questions.filter((question) => question.answered && question.id !== highlighted?.id)
  const visible = tab === 'answered' ? sortQnaQuestions(answered, 'recent') : sortQnaQuestions(open, tab)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    const trimmed = body.trim()
    if (trimmed.length < QNA_QUESTION_MIN) {
      setFormMessage({ kind: 'error', text: `Questions need at least ${QNA_QUESTION_MIN} characters.` })
      return
    }

    setSending(true)
    setFormMessage(null)
    writeStoredJson(NAME_STORAGE_KEY, name.trim())
    try {
      const response = await fetch('/api/qna/questions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', [QNA_VISITOR_HEADER]: getVisitorToken() },
        body: JSON.stringify({ body: trimmed, authorName: name.trim() || undefined }),
      })
      const result = (await response.json().catch(() => ({}))) as { question?: QnaPublicQuestion; error?: string }
      if (!response.ok || !result.question) {
        setFormMessage({ kind: 'error', text: result.error || 'Your question could not be sent. Please try again.' })
        return
      }
      setOwnQuestions((own) => [result.question as QnaPublicQuestion, ...own])
      setBody('')
      setTab('recent')
      setFormMessage({ kind: 'success', text: 'Question sent! It is now on the list.' })
    } catch {
      setFormMessage({ kind: 'error', text: 'You seem to be offline. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  async function toggleVote(question: QnaPublicQuestion) {
    const nextUpvoted = !upvoted[question.id]
    const optimistic = Math.max(0, question.upvotes + (nextUpvoted ? 1 : -1))
    const previous = upvoted
    const updated = { ...upvoted }
    if (nextUpvoted) updated[question.id] = true
    else delete updated[question.id]

    setVoteError('')
    setUpvoted(updated)
    writeStoredJson(QNA_UPVOTES_STORAGE_KEY, updated)
    setPendingVotes((pending) => ({ ...pending, [question.id]: { upvotes: optimistic, until: Date.now() + PENDING_VOTE_MS } }))

    try {
      const response = await fetch(`/api/qna/questions/${question.id}/upvote`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [QNA_VISITOR_HEADER]: getVisitorToken() },
        body: JSON.stringify({ upvoted: nextUpvoted }),
      })
      const result = (await response.json().catch(() => ({}))) as { upvotes?: number; error?: string }
      if (!response.ok || typeof result.upvotes !== 'number') throw new Error(result.error || 'Your vote did not go through.')
      const confirmed = result.upvotes
      setPendingVotes((pending) => ({ ...pending, [question.id]: { upvotes: confirmed, until: Date.now() + PENDING_VOTE_MS } }))
    } catch (error) {
      setUpvoted(previous)
      writeStoredJson(QNA_UPVOTES_STORAGE_KEY, previous)
      setPendingVotes((pending) => {
        const rest = { ...pending }
        delete rest[question.id]
        return rest
      })
      setVoteError(error instanceof Error ? error.message : 'Your vote did not go through.')
    }
  }

  const session = snapshot?.session ?? null

  return (
    <main className="min-h-[100svh] bg-cream px-4 pb-16 pt-6 text-ink sm:px-6 sm:pt-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-midnight bg-sun text-midnight" aria-hidden="true">
            <MessageCircleQuestion className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Pillars of Tech · Live Q&amp;A</p>
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-[-0.03em] text-midnight sm:text-3xl">
              {session ? session.title : 'Live Q&A'}
            </h1>
          </div>
        </header>

        {!snapshot && !loadError ? (
          <p role="status" className="border border-midnight/20 bg-warm p-6 text-ink/70">Loading questions…</p>
        ) : null}

        {!snapshot && loadError ? (
          <p role="alert" className="border border-midnight/20 bg-warm p-6 text-ink/80">
            We could not reach the Q&amp;A. Check your connection; this page will keep retrying.
          </p>
        ) : null}

        {snapshot && !session ? (
          <section className="border border-midnight/25 bg-warm p-7 shadow-[6px_6px_0_#0D2B4A]">
            <h2 className="font-display text-xl font-semibold text-midnight">The Q&amp;A has not started yet</h2>
            <p className="mt-2 text-ink/75">Keep this page open. Questions will open here as soon as the host starts the session.</p>
          </section>
        ) : null}

        {session ? (
          <>
            {session.acceptingQuestions ? (
              <form onSubmit={submit} className="border border-midnight/25 bg-warm p-5 shadow-[6px_6px_0_#0D2B4A] sm:p-6">
                <label htmlFor="qna-question" className="font-display text-lg font-semibold text-midnight">
                  Ask the panel
                </label>
                <textarea
                  id="qna-question"
                  value={body}
                  onChange={(event) => setBody(event.target.value.slice(0, QNA_QUESTION_MAX))}
                  rows={3}
                  maxLength={QNA_QUESTION_MAX}
                  placeholder="Type your question"
                  className="mt-3 w-full resize-y border border-midnight/30 bg-white/70 p-3 text-base text-ink placeholder:text-ink/45 focus:border-midnight focus:outline-hidden focus:ring-2 focus:ring-sky"
                  required
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="qna-name" className="text-sm font-semibold text-ink/80">
                      Your name <span className="font-normal text-ink/60">(optional)</span>
                    </label>
                    <input
                      id="qna-name"
                      value={name}
                      onChange={(event) => setName(event.target.value.slice(0, QNA_NAME_MAX))}
                      maxLength={QNA_NAME_MAX}
                      autoComplete="given-name"
                      placeholder="Anonymous"
                      className="mt-1 w-full border border-midnight/30 bg-white/70 px-3 py-2 text-base text-ink placeholder:text-ink/45 focus:border-midnight focus:outline-hidden focus:ring-2 focus:ring-sky"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || body.trim().length === 0}
                    aria-busy={sending}
                    className="inline-flex min-h-11 items-center justify-center gap-2 border border-midnight bg-midnight px-5 font-bold text-warm transition-colors hover:bg-cobalt focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
                <div className="mt-2 flex items-start justify-between gap-3 text-sm">
                  <p role={formMessage?.kind === 'error' ? 'alert' : 'status'} aria-live="polite" className={formMessage?.kind === 'error' ? 'text-red-800' : 'text-green-800'}>
                    {formMessage?.text}
                  </p>
                  <span className="shrink-0 text-ink/55">{body.length}/{QNA_QUESTION_MAX}</span>
                </div>
              </form>
            ) : (
              <p role="status" className="border border-midnight/25 bg-warm p-5 text-ink/80">
                Questions are closed right now. You can still upvote the ones you want answered.
              </p>
            )}

            {highlighted ? (
              <section aria-labelledby="qna-now" className="mt-6 border-2 border-midnight bg-sky p-5">
                <p id="qna-now" className="font-display text-xs font-bold uppercase tracking-[0.18em] text-midnight">Now answering</p>
                <QuestionCard question={highlighted} upvoted={Boolean(upvoted[highlighted.id])} onVote={toggleVote} now={now} flat />
              </section>
            ) : null}

            <div className="mt-6 flex border border-midnight/30 bg-warm" role="tablist" aria-label="Sort questions">
              {(['popular', 'recent', 'answered'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`min-h-11 flex-1 text-sm font-bold capitalize transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky ${tab === value ? 'bg-midnight text-warm' : 'text-midnight hover:bg-white/60'}`}
                >
                  {value}
                  {value === 'answered' ? ` (${answered.length})` : ''}
                </button>
              ))}
            </div>

            <p className="mt-3 text-sm text-ink/65" aria-live="polite">
              {open.length} {open.length === 1 ? 'question' : 'questions'}
              {loadError ? ' · reconnecting…' : ''}
            </p>
            {voteError ? <p role="alert" className="mt-2 text-sm text-red-800">{voteError}</p> : null}

            <ul className="mt-3 flex flex-col gap-3">
              {visible.map((question) => (
                <li key={question.id}>
                  <QuestionCard question={question} upvoted={Boolean(upvoted[question.id])} onVote={toggleVote} now={now} />
                </li>
              ))}
            </ul>
            {visible.length === 0 ? (
              <p className="mt-4 border border-dashed border-midnight/30 p-6 text-center text-ink/65">
                {tab === 'answered' ? 'No answered questions yet.' : 'No questions yet. Be the first to ask!'}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  )
}

function QuestionCard({
  question,
  upvoted,
  onVote,
  now,
  flat = false,
}: {
  question: QnaPublicQuestion
  upvoted: boolean
  onVote: (question: QnaPublicQuestion) => void
  now: number
  flat?: boolean
}) {
  return (
    <article className={`flex gap-4 ${flat ? 'mt-2' : 'border border-midnight/20 bg-warm p-4'}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink/65">
          <span className="font-semibold text-ink/85">{question.authorName || 'Anonymous'}</span>
          {' · '}
          {timeAgo(question.createdAt, now)}
          {question.answered ? (
            <span className="ml-2 inline-flex items-center gap-1 font-semibold text-green-800">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Answered
            </span>
          ) : null}
        </p>
        <p className="mt-1 whitespace-pre-line break-words text-base leading-6 text-ink">{question.body}</p>
      </div>
      <button
        type="button"
        onClick={() => onVote(question)}
        aria-pressed={upvoted}
        aria-label={`${upvoted ? 'Remove upvote' : 'Upvote'} (${question.upvotes} ${question.upvotes === 1 ? 'vote' : 'votes'})`}
        className={`flex min-h-11 min-w-14 shrink-0 flex-col items-center justify-center self-start border px-2 py-1.5 text-sm font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky ${upvoted ? 'border-midnight bg-midnight text-warm' : 'border-midnight/30 bg-white/60 text-midnight hover:border-midnight'}`}
      >
        <ThumbsUp className="h-4 w-4" aria-hidden="true" />
        {question.upvotes}
      </button>
    </article>
  )
}
