'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import QRCode from 'qrcode'
import { BarChart3, ChevronDown, Copy, Download, Lock, PencilLine, Plus, Radio, Square, Trash2, Unlock } from 'lucide-react'

import { FEEDBACK_TITLE_MAX, type FeedbackAdminForm, type FeedbackAdminSnapshot } from '@/lib/feedback-contracts'

import { usePolling } from '../qna/qna-client'
import { dangerButton, formatDate, primaryButton, secondaryButton, sendJson } from './admin-ui'
import FeedbackEditor from './FeedbackEditor'
import FeedbackResultsView from './FeedbackResultsView'

type View = 'results' | 'edit'

function PastForm({ form, busy, onMakeLive, onDelete }: { form: FeedbackAdminForm; busy: boolean; onMakeLive: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="border border-midnight/20 bg-warm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky">
          <ChevronDown className={`h-5 w-5 shrink-0 text-midnight transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold text-midnight">{form.title}</span>
            <span className="block text-sm text-ink/65">
              {formatDate(form.createdAt)} · {form.responseCount} {form.responseCount === 1 ? 'response' : 'responses'}
            </span>
          </span>
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} disabled={busy} onClick={onMakeLive}>
            <Radio className="h-4 w-4" aria-hidden="true" /> Make live again
          </button>
          <button type="button" className={dangerButton} disabled={busy} onClick={onDelete}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-midnight/15 bg-cream/40 p-4">
          <FeedbackResultsView formId={form.id} />
        </div>
      ) : null}
    </li>
  )
}

export default function FeedbackHost() {
  const [snapshot, setSnapshot] = useState<FeedbackAdminSnapshot | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [useTemplate, setUseTemplate] = useState(true)
  const [view, setView] = useState<View>('results')
  const [audienceUrl, setAudienceUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/feedback', { cache: 'no-store' })
      const result = (await response.json().catch(() => ({}))) as FeedbackAdminSnapshot & { error?: string; message?: string }
      if (!response.ok) throw new Error(result.message || result.error || 'Feedback forms could not be loaded.')
      setSnapshot(result)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Feedback forms could not be loaded.')
    }
  }, [])

  usePolling(load, 10_000)

  useEffect(() => {
    const url = `${window.location.origin}/feedback`
    setAudienceUrl(url)
    void QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 1024, color: { dark: '#0D2B4A', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [])

  const form = snapshot?.forms.find((item) => item.id === snapshot.currentFormId) ?? null
  const pastForms = snapshot?.forms.filter((item) => item.id !== snapshot.currentFormId) ?? []

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

  const updateForm = (patch: Record<string, unknown>) => (form ? run(() => sendJson('/api/admin/feedback', 'PATCH', { formId: form.id, ...patch })) : undefined)

  function endForm() {
    if (!form) return
    if (!window.confirm(`End "${form.title}"?\n\nThe form closes, /feedback goes back to "no form open", and it moves to Past forms with all its responses.`)) return
    void updateForm({ acceptingResponses: false, isCurrent: false })
  }

  function createForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    if (form && !window.confirm(`Start "${title}"?\n\n"${form.title}" is live now and will move to Past forms.`)) return
    void run(async () => {
      await sendJson('/api/admin/feedback', 'POST', { title, useTemplate, makeCurrent: true })
      setNewTitle('')
      setView(useTemplate ? 'results' : 'edit')
    })
  }

  function makeLive(past: FeedbackAdminForm) {
    const replacing = form ? `\n\n"${form.title}" is live now and will move to Past forms.` : ''
    if (!window.confirm(`Make "${past.title}" live on /feedback again and reopen it?${replacing}`)) return
    void run(() => sendJson('/api/admin/feedback', 'PATCH', { formId: past.id, isCurrent: true, acceptingResponses: true }))
  }

  function deleteForm(past: FeedbackAdminForm) {
    const count = `${past.responseCount} ${past.responseCount === 1 ? 'response' : 'responses'}`
    if (!window.confirm(`Permanently delete "${past.title}" and its ${count}?\n\nDownload the CSV first if you want to keep them. This cannot be undone.`)) return
    void run(() => sendJson('/api/admin/feedback', 'DELETE', { formId: past.id }))
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
      <header>
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Unlisted page · /feedback</p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] text-midnight sm:text-4xl">Event feedback</h1>
        <p className="mt-1 max-w-xl text-sm leading-6 text-ink/70">
          One form is live at a time. Share the QR code at the end of the event, watch responses come in, and download them as a spreadsheet.
        </p>
      </header>

      {error ? <p role="alert" className="border border-red-800/40 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="border border-midnight/25 bg-warm p-5" aria-labelledby="feedback-live-heading">
          <h2 id="feedback-live-heading" className="font-display text-lg font-semibold text-midnight">Live form</h2>
          {!snapshot ? <p className="mt-2 text-sm text-ink/70">Loading…</p> : null}

          {snapshot && form ? (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-midnight">{form.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 border border-green-800/40 bg-green-50 px-2 py-0.5 font-bold text-green-900">
                    <Radio className="h-3.5 w-3.5" aria-hidden="true" /> Live on /feedback
                  </span>
                  <span className={`border px-2 py-0.5 font-bold ${form.acceptingResponses ? 'border-midnight/30 text-midnight' : 'border-red-800/40 bg-red-50 text-red-900'}`}>
                    {form.acceptingResponses ? 'Accepting responses' : 'Closed'}
                  </span>
                  <span className="text-ink/70">{form.questionCount} questions · {form.responseCount} responses</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.acceptingResponses ? (
                  <button type="button" className={secondaryButton} disabled={busy} onClick={() => updateForm({ acceptingResponses: false })}>
                    <Lock className="h-4 w-4" aria-hidden="true" /> Close form
                  </button>
                ) : (
                  <button type="button" className={secondaryButton} disabled={busy} onClick={() => updateForm({ acceptingResponses: true })}>
                    <Unlock className="h-4 w-4" aria-hidden="true" /> Reopen form
                  </button>
                )}
                <button type="button" className={dangerButton} disabled={busy} onClick={endForm}>
                  <Square className="h-4 w-4" aria-hidden="true" /> End form
                </button>
              </div>
            </div>
          ) : null}

          {snapshot && !form ? (
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Nothing is live. Anyone opening /feedback sees &ldquo;no feedback form is open&rdquo;. Create a form below, or make a past one live again.
            </p>
          ) : null}

          <form onSubmit={createForm} className="mt-5 flex flex-col gap-2 border-t border-midnight/15 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="feedback-new-form" className="sr-only">New form title</label>
              <input
                id="feedback-new-form"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                maxLength={FEEDBACK_TITLE_MAX}
                placeholder="New form title, e.g. Career Panel 2026 Feedback"
                className="min-h-10 flex-1 border border-midnight/30 bg-white/70 px-3 text-base"
              />
              <button type="submit" className={form ? secondaryButton : primaryButton} disabled={busy || !newTitle.trim()}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Create and go live
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/80">
              <input type="checkbox" checked={useTemplate} onChange={(event) => setUseTemplate(event.target.checked)} className="h-4 w-4 accent-[#0D2B4A]" />
              Start with the career panel questions (you can edit them)
            </label>
          </form>
        </section>

        <aside className="border border-midnight/25 bg-warm p-5" aria-labelledby="feedback-share-heading">
          <h2 id="feedback-share-heading" className="font-display text-lg font-semibold text-midnight">Feedback link</h2>
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
              <a className={secondaryButton} href={qrDataUrl} download="pillars-of-tech-feedback-qr.png">
                <Download className="h-4 w-4" aria-hidden="true" /> QR PNG
              </a>
            ) : null}
          </div>
        </aside>
      </div>

      {form ? (
        <section aria-label="Live form details" className="flex flex-col gap-4">
          <div className="flex border border-midnight/30 bg-warm sm:w-fit" role="tablist" aria-label="Live form view">
            {([
              ['results', 'Results', BarChart3],
              ['edit', 'Edit questions', PencilLine],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => setView(value)}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-4 text-sm font-bold ${view === value ? 'bg-midnight text-warm' : 'text-midnight hover:bg-white/60'}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
          {view === 'results' ? (
            <FeedbackResultsView key={form.id} formId={form.id} live />
          ) : (
            <FeedbackEditor key={form.id} formId={form.id} responseCount={form.responseCount} onSaved={() => void load()} />
          )}
        </section>
      ) : null}

      {snapshot ? (
        <details className="group border border-midnight/25 bg-cream/40">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-warm px-5 py-3 font-display text-lg font-semibold text-midnight focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky [&::-webkit-details-marker]:hidden">
            <span>Past forms ({pastForms.length})</span>
            <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="p-4">
            {pastForms.length === 0 ? (
              <p className="text-sm text-ink/65">Forms you end will appear here, with all their responses.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pastForms.map((past) => (
                  <PastForm key={past.id} form={past} busy={busy} onMakeLive={() => makeLive(past)} onDelete={() => deleteForm(past)} />
                ))}
              </ul>
            )}
          </div>
        </details>
      ) : null}
    </div>
  )
}
