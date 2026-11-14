'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, MessageSquareHeart, Send, Star } from 'lucide-react'

import {
  FEEDBACK_LONG_TEXT_MAX,
  FEEDBACK_NAME_MAX,
  FEEDBACK_SHORT_TEXT_MAX,
  FEEDBACK_SUBMITTED_STORAGE_KEY,
  type FeedbackAnswer,
  type FeedbackPublicForm,
  type FeedbackQuestion,
} from '@/lib/feedback-contracts'
import { QNA_VISITOR_HEADER } from '@/lib/qna-contracts'

import { getVisitorToken, readStoredJson, writeStoredJson } from '../qna/qna-client'

type Status = 'loading' | 'error' | 'ready' | 'sent'

const inputClass =
  'w-full border border-midnight/30 bg-white/70 px-3 py-2 text-base text-ink placeholder:text-ink/45 focus:border-midnight focus:outline-hidden focus:ring-2 focus:ring-sky'

const ratingWords = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

function isAnswered(question: FeedbackQuestion, value: FeedbackAnswer | undefined): boolean {
  if (value === undefined) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

export default function FeedbackForm() {
  const [status, setStatus] = useState<Status>('loading')
  const [form, setForm] = useState<FeedbackPublicForm | null>(null)
  const [answers, setAnswers] = useState<Record<string, FeedbackAnswer>>({})
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [errorQuestionId, setErrorQuestionId] = useState<string | null>(null)
  const [alreadySent, setAlreadySent] = useState(false)
  const questionRefs = useRef<Record<string, HTMLFieldSetElement | null>>({})

  useEffect(() => {
    let active = true
    fetch('/api/feedback', { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('unavailable')
        const result = (await response.json()) as { form: FeedbackPublicForm | null }
        if (!active) return
        setForm(result.form)
        const submitted = readStoredJson<Record<string, true>>(FEEDBACK_SUBMITTED_STORAGE_KEY, {})
        if (result.form && submitted[result.form.id]) {
          setAlreadySent(true)
          setStatus('sent')
        } else {
          setStatus('ready')
        }
      })
      .catch(() => active && setStatus('error'))
    return () => {
      active = false
    }
  }, [])

  function setAnswer(questionId: string, value: FeedbackAnswer | undefined) {
    setAnswers((current) => {
      const next = { ...current }
      if (value === undefined) delete next[questionId]
      else next[questionId] = value
      return next
    })
    if (errorQuestionId === questionId) {
      setErrorQuestionId(null)
      setError('')
    }
  }

  function flagQuestion(questionId: string, message: string) {
    setErrorQuestionId(questionId)
    setError(message)
    const target = questionRefs.current[questionId]
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true })
  }

  function markSent() {
    if (!form) return
    const submitted = readStoredJson<Record<string, true>>(FEEDBACK_SUBMITTED_STORAGE_KEY, {})
    writeStoredJson(FEEDBACK_SUBMITTED_STORAGE_KEY, { ...submitted, [form.id]: true })
    setStatus('sent')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || sending) return

    const missing = form.questions.find((question) => question.required && !isAnswered(question, answers[question.id]))
    if (missing) {
      flagQuestion(missing.id, `Please answer: ${missing.prompt}`)
      return
    }

    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/feedback/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', [QNA_VISITOR_HEADER]: getVisitorToken() },
        body: JSON.stringify({
          formId: form.id,
          answers,
          ...(form.collectContact && name.trim() ? { name: name.trim() } : {}),
          ...(form.collectContact && email.trim() ? { email: email.trim() } : {}),
        }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string; questionId?: string; duplicate?: boolean }
      if (response.ok) return markSent()
      if (result.duplicate) {
        setAlreadySent(true)
        return markSent()
      }
      if (result.questionId) return flagQuestion(result.questionId, result.error || 'Please check this answer.')
      setError(result.error || 'Your feedback could not be sent. Please try again.')
    } catch {
      setError('You seem to be offline. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-[100svh] bg-cream px-4 pb-16 pt-6 text-ink sm:px-6 sm:pt-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-midnight bg-coral text-midnight" aria-hidden="true">
            <MessageSquareHeart className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Pillars of Tech · Event feedback</p>
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-[-0.03em] text-midnight sm:text-3xl">
              {form ? form.title : 'Event feedback'}
            </h1>
          </div>
        </header>

        {status === 'loading' ? <p role="status" className="border border-midnight/20 bg-warm p-6 text-ink/70">Loading…</p> : null}

        {status === 'error' ? (
          <p role="alert" className="border border-midnight/20 bg-warm p-6 text-ink/80">
            We could not load the form. Check your connection and reload this page.
          </p>
        ) : null}

        {status === 'sent' ? (
          <section role="status" className="border border-midnight/25 bg-warm p-7 shadow-[6px_6px_0_#0D2B4A]">
            <CheckCircle2 className="h-10 w-10 text-green-800" aria-hidden="true" />
            <h2 className="mt-3 font-display text-2xl font-semibold text-midnight">Thank you!</h2>
            <p className="mt-2 text-ink/75">
              {alreadySent ? 'We already have your feedback from this device.' : 'Your feedback was sent.'} It helps us make the next event even better.
            </p>
          </section>
        ) : null}

        {status === 'ready' && !form ? (
          <section className="border border-midnight/25 bg-warm p-7 shadow-[6px_6px_0_#0D2B4A]">
            <h2 className="font-display text-xl font-semibold text-midnight">No feedback form is open right now</h2>
            <p className="mt-2 text-ink/75">Check back after the event, or ask a Pillars of Tech volunteer.</p>
          </section>
        ) : null}

        {status === 'ready' && form && !form.acceptingResponses ? (
          <section className="border border-midnight/25 bg-warm p-7 shadow-[6px_6px_0_#0D2B4A]">
            <h2 className="font-display text-xl font-semibold text-midnight">This form is closed</h2>
            <p className="mt-2 text-ink/75">Thanks for your interest. Feedback for this event is no longer being collected.</p>
          </section>
        ) : null}

        {status === 'ready' && form && form.acceptingResponses ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            {form.intro ? <p className="text-base leading-7 text-ink/80">{form.intro}</p> : null}

            {form.questions.map((question, index) => (
              <fieldset
                key={question.id}
                ref={(element) => {
                  questionRefs.current[question.id] = element
                }}
                aria-invalid={errorQuestionId === question.id || undefined}
                className={`border bg-warm p-5 ${errorQuestionId === question.id ? 'border-2 border-red-800' : 'border-midnight/25'}`}
              >
                <legend className="sr-only">{question.prompt}</legend>
                <p aria-hidden="true" className="font-display text-lg font-semibold leading-snug text-midnight">
                  <span className="mr-2 text-cobalt/60">{index + 1}.</span>
                  {question.prompt}
                  {question.required ? <span className="ml-1 text-red-800">*</span> : null}
                </p>
                <div className="mt-3">
                  <QuestionInput question={question} value={answers[question.id]} onChange={(value) => setAnswer(question.id, value)} />
                </div>
              </fieldset>
            ))}

            {form.collectContact ? (
              <fieldset className="border border-midnight/25 bg-warm p-5">
                <legend className="sr-only">Contact details (optional)</legend>
                <p aria-hidden="true" className="font-display text-lg font-semibold text-midnight">Stay in touch <span className="font-body text-sm font-normal text-ink/60">(optional)</span></p>
                <p className="mt-1 text-sm text-ink/65">Only if you would like us to follow up or tell you about future events.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-ink/80">
                    Name
                    <input value={name} onChange={(event) => setName(event.target.value)} maxLength={FEEDBACK_NAME_MAX} autoComplete="name" className={`mt-1 ${inputClass}`} />
                  </label>
                  <label className="text-sm font-semibold text-ink/80">
                    Email
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" inputMode="email" className={`mt-1 ${inputClass}`} />
                  </label>
                </div>
              </fieldset>
            ) : null}

            {error ? <p role="alert" className="border border-red-800/40 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}

            <button
              type="submit"
              disabled={sending}
              aria-busy={sending}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-midnight bg-midnight px-6 text-lg font-bold text-warm transition-colors hover:bg-cobalt focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
              {sending ? 'Sending…' : 'Send feedback'}
            </button>
            <p className="text-center text-sm text-ink/60"><span className="text-red-800">*</span> Required</p>
          </form>
        ) : null}
      </div>
    </main>
  )
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: FeedbackQuestion
  value: FeedbackAnswer | undefined
  onChange: (value: FeedbackAnswer | undefined) => void
}) {
  const name = `q-${question.id}`

  if (question.kind === 'rating') {
    const selected = typeof value === 'number' ? value : 0
    return (
      <div>
        <div role="radiogroup" aria-label={question.prompt} className="flex gap-1 sm:gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              role="radio"
              aria-checked={selected === rating}
              aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}, ${ratingWords[rating]}`}
              onClick={() => onChange(selected === rating && !question.required ? undefined : rating)}
              className="inline-flex min-h-12 min-w-12 items-center justify-center text-midnight transition-transform hover:scale-110 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky"
            >
              <Star className={`h-9 w-9 ${rating <= selected ? 'fill-sun' : 'fill-transparent'}`} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm font-semibold text-ink/70" aria-hidden="true">{selected ? ratingWords[selected] : ''}</p>
      </div>
    )
  }

  if (question.kind === 'single_choice' || question.kind === 'multi_choice') {
    const multiple = question.kind === 'multi_choice'
    const picked = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
    return (
      <div className="flex flex-col gap-2">
        {multiple ? <p className="text-sm text-ink/60">Choose all that apply.</p> : null}
        {question.options.map((option) => (
          <label
            key={option}
            className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2 text-base transition-colors ${picked.includes(option) ? 'border-midnight bg-sky/60' : 'border-midnight/20 bg-white/50 hover:border-midnight/50'}`}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={name}
              value={option}
              checked={picked.includes(option)}
              onChange={(event) => {
                if (!multiple) return onChange(option)
                const next = event.target.checked ? [...picked, option] : picked.filter((item) => item !== option)
                onChange(next.length ? question.options.filter((item) => next.includes(item)) : undefined)
              }}
              className="h-5 w-5 shrink-0 accent-[#0D2B4A]"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    )
  }

  const long = question.kind === 'long_text'
  const max = long ? FEEDBACK_LONG_TEXT_MAX : FEEDBACK_SHORT_TEXT_MAX
  const text = typeof value === 'string' ? value : ''
  return long ? (
    <textarea
      aria-label={question.prompt}
      value={text}
      onChange={(event) => onChange(event.target.value ? event.target.value.slice(0, max) : undefined)}
      maxLength={max}
      rows={4}
      className={`resize-y ${inputClass}`}
    />
  ) : (
    <input aria-label={question.prompt} value={text} onChange={(event) => onChange(event.target.value ? event.target.value.slice(0, max) : undefined)} maxLength={max} className={inputClass} />
  )
}
