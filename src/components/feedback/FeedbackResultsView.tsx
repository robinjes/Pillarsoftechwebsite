'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw, Star } from 'lucide-react'

import type { FeedbackAnswer, FeedbackQuestion, FeedbackResponse, FeedbackResults } from '@/lib/feedback-contracts'

import { usePolling } from '../qna/qna-client'
import { fileSlug, secondaryButton } from './admin-ui'

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function answerText(value: FeedbackAnswer | undefined): string {
  if (value === undefined) return ''
  return Array.isArray(value) ? value.join('; ') : String(value)
}

export function feedbackCsv(results: FeedbackResults): string {
  const header = ['Submitted at', ...results.questions.map((question) => question.prompt), ...(results.form.collectContact ? ['Name', 'Email'] : [])]
  const rows = results.responses.map((response) => [
    response.createdAt,
    ...results.questions.map((question) => answerText(response.answers[question.id])),
    ...(results.form.collectContact ? [response.name ?? '', response.email ?? ''] : []),
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}

function downloadCsv(results: FeedbackResults) {
  const url = URL.createObjectURL(new Blob([feedbackCsv(results)], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileSlug(results.form.title)}-feedback.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total ? Math.round((count / total) * 100) : 0
  return (
    <li className="grid grid-cols-[minmax(6rem,12rem)_1fr_auto] items-center gap-3 text-sm">
      <span className="truncate text-ink/85" title={label}>{label}</span>
      <span className="h-3 bg-midnight/10" aria-hidden="true">
        <span className="block h-full bg-midnight" style={{ width: `${percent}%` }} />
      </span>
      <span className="w-16 text-right tabular-nums text-ink/70">{count} · {percent}%</span>
    </li>
  )
}

function QuestionSummary({ question, responses }: { question: FeedbackQuestion; responses: FeedbackResponse[] }) {
  const values = responses.map((response) => response.answers[question.id]).filter((value) => value !== undefined)
  const answered = values.length

  let body: React.ReactNode = null
  if (question.kind === 'rating') {
    const ratings = values.filter((value): value is number => typeof value === 'number')
    const average = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0
    body = (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex items-center gap-2">
          <Star className="h-8 w-8 fill-sun text-midnight" strokeWidth={1.75} aria-hidden="true" />
          <span className="font-display text-3xl font-semibold text-midnight">{ratings.length ? average.toFixed(1) : '–'}</span>
          <span className="text-sm text-ink/60">/ 5</span>
        </div>
        <ul className="flex flex-1 flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <Bar key={star} label={`${star} ${star === 1 ? 'star' : 'stars'}`} count={ratings.filter((value) => value === star).length} total={ratings.length} />
          ))}
        </ul>
      </div>
    )
  } else if (question.kind === 'single_choice' || question.kind === 'multi_choice') {
    const counts = new Map<string, number>()
    for (const value of values) {
      for (const option of Array.isArray(value) ? value : [String(value)]) counts.set(option, (counts.get(option) ?? 0) + 1)
    }
    // Options removed after people answered still show, after the current ones.
    const labels = [...question.options, ...[...counts.keys()].filter((option) => !question.options.includes(option))]
    body = (
      <ul className="flex flex-col gap-1.5">
        {labels.map((option) => <Bar key={option} label={option} count={counts.get(option) ?? 0} total={answered} />)}
      </ul>
    )
  } else {
    const texts = values.map((value) => String(value)).filter(Boolean)
    body = texts.length ? (
      <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
        {texts.map((text, index) => (
          <li key={index} className="whitespace-pre-line break-words border-l-4 border-sky bg-white/60 px-3 py-2 text-sm text-ink">{text}</li>
        ))}
      </ul>
    ) : null
  }

  return (
    <article className="border border-midnight/20 bg-warm p-4">
      <h4 className="font-display text-base font-semibold text-midnight">{question.prompt}</h4>
      <p className="mb-3 text-sm text-ink/60">{answered} {answered === 1 ? 'answer' : 'answers'}</p>
      {answered ? body : <p className="text-sm text-ink/55">No answers yet.</p>}
    </article>
  )
}

/** Summary of one form's responses. Polls while the form is live. */
export default function FeedbackResultsView({ formId, live = false }: { formId: string; live?: boolean }) {
  const [results, setResults] = useState<FeedbackResults | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/feedback/form?formId=${encodeURIComponent(formId)}`, { cache: 'no-store' })
      const result = (await response.json().catch(() => ({}))) as FeedbackResults & { error?: string }
      if (!response.ok) throw new Error(result.error || 'Feedback could not be loaded.')
      setResults(result)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Feedback could not be loaded.')
    }
  }, [formId])

  useEffect(() => {
    if (!live) void load()
  }, [live, load])
  usePolling(live ? load : () => undefined, 10_000)

  if (error && !results) return <p role="alert" className="text-sm text-red-900">{error}</p>
  if (!results) return <p role="status" className="text-sm text-ink/65">Loading responses…</p>

  const contacts = results.responses.filter((response) => response.name || response.email)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-xl font-semibold text-midnight">
          {results.responses.length} {results.responses.length === 1 ? 'response' : 'responses'}
          {live ? <span className="ml-2 align-middle text-xs font-bold uppercase tracking-[0.14em] text-green-800">updates live</span> : null}
        </p>
        <div className="flex gap-2">
          <button type="button" className={secondaryButton} onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
          <button type="button" className={secondaryButton} disabled={results.responses.length === 0} onClick={() => downloadCsv(results)}>
            <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
          </button>
        </div>
      </div>
      {error ? <p role="alert" className="text-sm text-red-900">{error}</p> : null}

      {results.questions.map((question) => <QuestionSummary key={question.id} question={question} responses={results.responses} />)}

      {results.form.collectContact ? (
        <article className="border border-midnight/20 bg-warm p-4">
          <h4 className="font-display text-base font-semibold text-midnight">People who left contact details</h4>
          <p className="mb-3 text-sm text-ink/60">{contacts.length} of {results.responses.length}</p>
          {contacts.length ? (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm">
              {contacts.map((response) => (
                <li key={response.id} className="flex flex-wrap gap-x-3 border-b border-midnight/10 py-1">
                  <span className="font-semibold text-ink">{response.name || 'No name'}</span>
                  {response.email ? <a className="text-cobalt underline" href={`mailto:${response.email}`}>{response.email}</a> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}
    </div>
  )
}
