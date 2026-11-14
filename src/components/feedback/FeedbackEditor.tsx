'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Undo2 } from 'lucide-react'

import {
  FEEDBACK_INTRO_MAX,
  FEEDBACK_KIND_LABELS,
  FEEDBACK_KINDS,
  FEEDBACK_MAX_QUESTIONS,
  FEEDBACK_PROMPT_MAX,
  FEEDBACK_TITLE_MAX,
  isChoiceKind,
  type FeedbackKind,
  type FeedbackResults,
} from '@/lib/feedback-contracts'

import { dangerButton, fieldClass, primaryButton, secondaryButton, sendJson } from './admin-ui'

type DraftQuestion = {
  key: string
  id?: string
  kind: FeedbackKind
  prompt: string
  required: boolean
  optionsText: string
}

type Draft = { title: string; intro: string; collectContact: boolean; questions: DraftQuestion[] }

let draftKey = 0
const nextKey = () => `draft-${++draftKey}`

function toDraft(results: FeedbackResults): Draft {
  return {
    title: results.form.title,
    intro: results.form.intro,
    collectContact: results.form.collectContact,
    questions: results.questions.map((question) => ({
      key: question.id,
      id: question.id,
      kind: question.kind,
      prompt: question.prompt,
      required: question.required,
      optionsText: question.options.join('\n'),
    })),
  }
}

function optionsFrom(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
}

/** Edit a form's title, intro, contact section, and question list. */
export default function FeedbackEditor({ formId, responseCount, onSaved }: { formId: string; responseCount: number; onSaved: () => void }) {
  const [saved, setSaved] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/feedback/form?formId=${encodeURIComponent(formId)}`, { cache: 'no-store' })
      const result = (await response.json().catch(() => ({}))) as FeedbackResults & { error?: string }
      if (!response.ok) throw new Error(result.error || 'The form could not be loaded.')
      const loaded = toDraft(result)
      setSaved(loaded)
      setDraft(loaded)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The form could not be loaded.')
    }
  }, [formId])

  useEffect(() => {
    void load()
  }, [load])

  if (!draft || !saved) return error ? <p role="alert" className="text-sm text-red-900">{error}</p> : <p role="status" className="text-sm text-ink/65">Loading form…</p>

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const updateQuestion = (key: string, patch: Partial<DraftQuestion>) =>
    setDraft({ ...draft, questions: draft.questions.map((question) => (question.key === key ? { ...question, ...patch } : question)) })

  function move(index: number, delta: number) {
    if (!draft) return
    const questions = [...draft.questions]
    const [item] = questions.splice(index, 1)
    questions.splice(index + delta, 0, item)
    setDraft({ ...draft, questions })
  }

  function addQuestion(kind: FeedbackKind) {
    if (!draft || draft.questions.length >= FEEDBACK_MAX_QUESTIONS) return
    setDraft({
      ...draft,
      questions: [...draft.questions, { key: nextKey(), kind, prompt: '', required: false, optionsText: isChoiceKind(kind) ? 'Option 1\nOption 2' : '' }],
    })
  }

  function removeQuestion(question: DraftQuestion) {
    if (!draft) return
    if (question.id && responseCount > 0 && !window.confirm(`Remove "${question.prompt || 'this question'}"?\n\nIts answers will no longer appear in results or the CSV.`)) return
    setDraft({ ...draft, questions: draft.questions.filter((item) => item.key !== question.key) })
  }

  async function save() {
    if (!draft || saving) return
    const blank = draft.questions.findIndex((question) => !question.prompt.trim())
    if (blank >= 0) return setError(`Question ${blank + 1} needs text.`)
    const fewOptions = draft.questions.findIndex((question) => isChoiceKind(question.kind) && new Set(optionsFrom(question.optionsText)).size < 2)
    if (fewOptions >= 0) return setError(`Question ${fewOptions + 1} needs at least two different options (one per line).`)
    if (!draft.title.trim()) return setError('The form needs a title.')

    setSaving(true)
    setError('')
    setMessage('')
    try {
      await sendJson('/api/admin/feedback', 'PATCH', { formId, title: draft.title, intro: draft.intro, collectContact: draft.collectContact })
      await sendJson('/api/admin/feedback/questions', 'PUT', {
        formId,
        questions: draft.questions.map((question) => ({
          ...(question.id ? { id: question.id } : {}),
          kind: question.kind,
          prompt: question.prompt,
          required: question.required,
          options: isChoiceKind(question.kind) ? optionsFrom(question.optionsText) : [],
        })),
      })
      await load()
      onSaved()
      setMessage('Saved. The live form updates within a few seconds.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The form could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {responseCount > 0 ? (
        <p className="border border-sun bg-sun/20 p-3 text-sm text-ink">
          This form already has {responseCount} {responseCount === 1 ? 'response' : 'responses'}. Rewording a question keeps its answers; removing one hides its answers.
        </p>
      ) : null}

      <div className="grid gap-3 border border-midnight/20 bg-warm p-4">
        <label className="text-sm font-semibold text-ink/80">
          Form title
          <input value={draft.title} maxLength={FEEDBACK_TITLE_MAX} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`mt-1 ${fieldClass}`} />
        </label>
        <label className="text-sm font-semibold text-ink/80">
          Intro shown at the top <span className="font-normal text-ink/55">(optional)</span>
          <textarea value={draft.intro} maxLength={FEEDBACK_INTRO_MAX} rows={2} onChange={(event) => setDraft({ ...draft, intro: event.target.value })} className={`mt-1 resize-y ${fieldClass}`} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink/80">
          <input type="checkbox" checked={draft.collectContact} onChange={(event) => setDraft({ ...draft, collectContact: event.target.checked })} className="h-5 w-5 accent-[#0D2B4A]" />
          Ask for optional name and email at the end
        </label>
      </div>

      <ol className="flex flex-col gap-3">
        {draft.questions.map((question, index) => (
          <li key={question.key} className="border border-midnight/20 bg-warm p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-sm font-bold uppercase tracking-[0.14em] text-cobalt">Question {index + 1}</span>
              <div className="flex gap-1">
                <button type="button" className={secondaryButton} aria-label={`Move question ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" className={secondaryButton} aria-label={`Move question ${index + 1} down`} disabled={index === draft.questions.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" className={dangerButton} aria-label={`Remove question ${index + 1}`} onClick={() => removeQuestion(question)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_14rem]">
              <label className="text-sm font-semibold text-ink/80">
                Question
                <input value={question.prompt} maxLength={FEEDBACK_PROMPT_MAX} placeholder="Type the question" onChange={(event) => updateQuestion(question.key, { prompt: event.target.value })} className={`mt-1 ${fieldClass}`} />
              </label>
              <label className="text-sm font-semibold text-ink/80">
                Type
                <select
                  value={question.kind}
                  onChange={(event) => {
                    const kind = event.target.value as FeedbackKind
                    updateQuestion(question.key, { kind, optionsText: isChoiceKind(kind) && !question.optionsText ? 'Option 1\nOption 2' : question.optionsText })
                  }}
                  className={`mt-1 min-h-[2.65rem] ${fieldClass}`}
                >
                  {FEEDBACK_KINDS.map((kind) => <option key={kind} value={kind}>{FEEDBACK_KIND_LABELS[kind]}</option>)}
                </select>
              </label>
            </div>
            {isChoiceKind(question.kind) ? (
              <label className="mt-3 block text-sm font-semibold text-ink/80">
                Options <span className="font-normal text-ink/55">(one per line)</span>
                <textarea value={question.optionsText} rows={Math.min(8, Math.max(3, optionsFrom(question.optionsText).length + 1))} onChange={(event) => updateQuestion(question.key, { optionsText: event.target.value })} className={`mt-1 resize-y ${fieldClass}`} />
              </label>
            ) : null}
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink/80">
              <input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(question.key, { required: event.target.checked })} className="h-5 w-5 accent-[#0D2B4A]" />
              Required
            </label>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2 border border-dashed border-midnight/30 p-3">
        <span className="text-sm font-semibold text-ink/70">Add a question:</span>
        {FEEDBACK_KINDS.map((kind) => (
          <button key={kind} type="button" className={secondaryButton} disabled={draft.questions.length >= FEEDBACK_MAX_QUESTIONS} onClick={() => addQuestion(kind)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> {FEEDBACK_KIND_LABELS[kind]}
          </button>
        ))}
      </div>

      {error ? <p role="alert" className="border border-red-800/40 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
      {message && !dirty ? <p role="status" className="text-sm font-semibold text-green-800">{message}</p> : null}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-t border-midnight/20 bg-cream/95 px-1 py-3">
        <button type="button" className={primaryButton} disabled={!dirty || saving} onClick={save}>
          <Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className={secondaryButton} disabled={!dirty || saving} onClick={() => { setDraft(saved); setError('') }}>
          <Undo2 className="h-4 w-4" aria-hidden="true" /> Discard
        </button>
        {dirty ? <span className="text-sm font-semibold text-ink/70">Unsaved changes</span> : null}
      </div>
    </div>
  )
}
