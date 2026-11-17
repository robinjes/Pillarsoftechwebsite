'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import QRCode from 'qrcode'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDashed,
  Copy,
  Download,
  Lock,
  Plus,
  QrCode,
  Radio,
  Square,
  Trash2,
  Unlock,
  UserPlus,
} from 'lucide-react'

import {
  isScoreComplete,
  JUDGING_NAME_MAX,
  JUDGING_TITLE_MAX,
  parseContestantLines,
  type JudgingAdminEvent,
  type JudgingAdminSnapshot,
  type JudgingEventDetail,
  type JudgingJudge,
} from '@/lib/judging-contracts'

import { dangerButton, fieldClass, formatDate, primaryButton, secondaryButton, sendJson } from '../feedback/admin-ui'
import { usePolling } from '../qna/qna-client'
import JudgingAudienceControls from './JudgingAudienceControls'
import JudgingTimer from './JudgingTimer'
import JudgingScoreboard from './JudgingScoreboard'
import JudgingObsControls from './JudgingObsControls'

async function fetchDetail(eventId: string, apiBase = '/api/admin/judging'): Promise<JudgingEventDetail> {
  const response = await fetch(`${apiBase}/event?eventId=${encodeURIComponent(eventId)}`, { cache: 'no-store' })
  const result = (await response.json().catch(() => ({}))) as JudgingEventDetail & { error?: string }
  if (!response.ok) throw new Error(result.error || 'The event could not be loaded.')
  return result
}

function JudgeRow({ judge, link, busy, onRemove }: { judge: JudgingJudge; link: string; busy: boolean; onRemove: () => void }) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  async function toggleQr() {
    if (qr) return setQr('')
    setQr(await QRCode.toDataURL(link, { errorCorrectionLevel: 'M', margin: 2, width: 600, color: { dark: '#0D2B4A', light: '#FFFFFF' } }))
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      // Clipboard can be blocked; the code is still visible to read out.
    }
  }

  return (
    <li className="border border-midnight/20 bg-warm p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 font-semibold text-midnight">{judge.name}</span>
        <span className="font-mono text-xl font-bold tracking-[0.2em] text-midnight" aria-label={`Code ${judge.accessCode.split('').join(' ')}`}>{judge.accessCode}</span>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={secondaryButton} onClick={copy} title="Copy this judge's sign-in link">
            <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? 'Copied' : 'Link'}
          </button>
          <button type="button" className={secondaryButton} aria-expanded={Boolean(qr)} onClick={toggleQr}>
            <QrCode className="h-4 w-4" aria-hidden="true" /> QR
          </button>
          <button type="button" className={dangerButton} disabled={busy} onClick={onRemove} aria-label={`Remove ${judge.name}`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {qr ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL generated in the browser */}
          <img src={qr} alt={`Sign-in QR code for ${judge.name}`} className="h-48 w-48 border border-midnight/20 bg-white" />
          <a className={secondaryButton} href={qr} download={`judge-${judge.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.png`}>
            <Download className="h-4 w-4" aria-hidden="true" /> Download QR
          </a>
          <p className="text-center text-xs text-ink/60">Scanning this signs {judge.name} in automatically.</p>
        </div>
      ) : null}
    </li>
  )
}

function PastEvent({ event, busy, onMakeLive, onDelete, demo = false }: { demo?: boolean; event: JudgingAdminEvent; busy: boolean; onMakeLive: () => void; onDelete: () => void }) {
  const [detail, setDetail] = useState<JudgingEventDetail | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    setOpen(!open)
    if (open || detail) return
    try {
      setDetail(await fetchDetail(event.id, demo ? '/api/dev/judging/host' : '/api/admin/judging'))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The event could not be loaded.')
    }
  }

  return (
    <li className="border border-midnight/20 bg-warm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={toggle} aria-expanded={open} className="flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky">
          <ChevronDown className={`h-5 w-5 shrink-0 text-midnight transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold text-midnight">{event.title}</span>
            <span className="block text-sm text-ink/65">{formatDate(event.createdAt)} · {event.contestantCount} students · {event.judgeCount} judges</span>
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
          {error ? <p role="alert" className="text-sm text-red-900">{error}</p> : null}
          {!error && !detail ? <p role="status" className="text-sm text-ink/65">Loading…</p> : null}
          {detail ? <div className="flex flex-col gap-4"><JudgingAudienceControls event={detail.event} demo={demo} onChange={async () => setDetail(await fetchDetail(event.id, demo ? '/api/dev/judging/host' : '/api/admin/judging'))} /><JudgingObsControls key={event.id} eventId={event.id} demo={demo} /><JudgingScoreboard detail={detail} /></div> : null}
        </div>
      ) : null}
    </li>
  )
}

export default function JudgingHost({ demo = false }: { demo?: boolean }) {
  const apiBase = demo ? '/api/dev/judging/host' : '/api/admin/judging'
  const judgePath = demo ? '/judging/demo/judge' : '/judging'
  const [snapshot, setSnapshot] = useState<JudgingAdminSnapshot | null>(null)
  const [detail, setDetail] = useState<JudgingEventDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [studentsText, setStudentsText] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [origin, setOrigin] = useState('')
  const [qr, setQr] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch(apiBase, { cache: 'no-store' })
      const result = (await response.json().catch(() => ({}))) as JudgingAdminSnapshot & { error?: string; message?: string }
      if (!response.ok) throw new Error(result.message || result.error || 'Judging could not be loaded.')
      setSnapshot(result)
      setDetail(result.currentEventId ? await fetchDetail(result.currentEventId, apiBase) : null)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Judging could not be loaded.')
    }
  }, [apiBase])

  // Live scoreboard and "who has finished" while judging is running.
  usePolling(load, 3_000)

  useEffect(() => {
    setOrigin(window.location.origin)
    void QRCode.toDataURL(`${window.location.origin}${judgePath}`, { errorCorrectionLevel: 'M', margin: 2, width: 1024, color: { dark: '#0D2B4A', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [judgePath])

  const event = detail?.event ?? null
  const pastEvents = snapshot?.events.filter((item) => item.id !== snapshot.currentEventId) ?? []

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

  const updateEvent = (patch: Record<string, unknown>) => (event ? run(() => sendJson(apiBase, 'PATCH', { eventId: event.id, ...patch })) : undefined)

  function createEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    if (event && !window.confirm(`Start "${title}"?\n\n"${event.title}" is open now and will move to Past events.`)) return
    void run(async () => {
      await sendJson(apiBase, 'POST', { title })
      setNewTitle('')
    })
  }

  function endEvent() {
    if (!event) return
    if (!window.confirm(`End "${event.title}"?\n\nScores lock, judges are signed out, and the event moves to Past events with all its scores.`)) return
    void updateEvent({ scoresLocked: true, currentContestantId: null, isCurrent: false })
  }

  function addStudents(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!event) return
    const entries = parseContestantLines(studentsText)
    if (!entries.length) return
    void run(async () => {
      await sendJson(`${apiBase}/contestants`, 'POST', { eventId: event.id, entries })
      setStudentsText('')
    })
  }

  function addJudge(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!event || !judgeName.trim()) return
    void run(async () => {
      await sendJson(`${apiBase}/judges`, 'POST', { eventId: event.id, name: judgeName.trim() })
      setJudgeName('')
    })
  }

  const contestants = detail?.contestants ?? []
  const currentIndex = contestants.findIndex((contestant) => contestant.id === event?.currentContestantId)
  const current = currentIndex >= 0 ? contestants[currentIndex] : null
  const progress = (detail?.judges ?? []).map((judge) => {
    const score = current ? detail?.scores.find((item) => item.judgeId === judge.id && item.contestantId === current.id) : undefined
    return { judge, state: !score ? 'waiting' : isScoreComplete(score) ? 'done' : 'started' }
  })
  const doneCount = progress.filter((item) => item.state === 'done').length

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Unlisted page · {judgePath}</p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] text-midnight sm:text-4xl">Pitch judging</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
          Add students and judges, give each judge their code or QR, then pick who is pitching. Every judge&rsquo;s screen switches to that student within a few seconds.
        </p>
      </header>

      {error ? <p role="alert" className="border border-red-800/40 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="border border-midnight/25 bg-warm p-5" aria-labelledby="judging-event-heading">
          <h2 id="judging-event-heading" className="font-display text-lg font-semibold text-midnight">Event</h2>
          {!snapshot ? <p className="mt-2 text-sm text-ink/70">Loading…</p> : null}
          {snapshot && event ? (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-midnight">{event.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 border border-green-800/40 bg-green-50 px-2 py-0.5 font-bold text-green-900">
                    <Radio className="h-3.5 w-3.5" aria-hidden="true" /> Open on {judgePath}
                  </span>
                  <span className={`border px-2 py-0.5 font-bold ${event.scoresLocked ? 'border-red-800/40 bg-red-50 text-red-900' : 'border-midnight/30 text-midnight'}`}>
                    {event.scoresLocked ? 'Scores locked' : 'Judges can edit scores'}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {event.scoresLocked ? (
                  <button type="button" className={secondaryButton} disabled={busy} onClick={() => updateEvent({ scoresLocked: false })}>
                    <Unlock className="h-4 w-4" aria-hidden="true" /> Unlock scores
                  </button>
                ) : (
                  <button type="button" className={secondaryButton} disabled={busy} onClick={() => window.confirm('Lock scores? Judges will no longer be able to change any score.') && updateEvent({ scoresLocked: true })}>
                    <Lock className="h-4 w-4" aria-hidden="true" /> Lock scores
                  </button>
                )}
                <button type="button" className={dangerButton} disabled={busy} onClick={endEvent}>
                  <Square className="h-4 w-4" aria-hidden="true" /> End event
                </button>
              </div>
            </div>
          ) : null}
          {snapshot && !event ? <p className="mt-2 text-sm leading-6 text-ink/70">No judging event is open. Create one below, or make a past one live again.</p> : null}

          <form onSubmit={createEvent} className="mt-5 flex flex-col gap-2 border-t border-midnight/15 pt-4 sm:flex-row">
            <label htmlFor="judging-new-event" className="sr-only">New event name</label>
            <input id="judging-new-event" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={JUDGING_TITLE_MAX} placeholder="New event, e.g. Wildcat Tank Winter 2026" className="min-h-10 flex-1 border border-midnight/30 bg-white/70 px-3 text-base" />
            <button type="submit" className={event ? secondaryButton : primaryButton} disabled={busy || !newTitle.trim()}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Create and open
            </button>
          </form>
        </section>

        <aside className="border border-midnight/25 bg-warm p-5" aria-labelledby="judging-link-heading">
          <h2 id="judging-link-heading" className="font-display text-lg font-semibold text-midnight">Judging link</h2>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL generated in the browser
            <img src={qr} alt={`QR code for ${origin}${judgePath}`} className="mx-auto mt-3 h-40 w-40 border border-midnight/20 bg-white" />
          ) : null}
          <p className="mt-3 break-all text-center font-mono text-sm text-ink/80">{origin}{judgePath}</p>
          <p className="mt-2 text-center text-xs text-ink/60">Judges then type their code. Each judge&rsquo;s own QR (below) signs them in automatically.</p>
        </aside>
      </div>

      {event && detail ? (
        <>
          <section aria-labelledby="now-judging-heading" className="border-2 border-midnight bg-sky p-5">
            <h2 id="now-judging-heading" className="font-display text-xs font-bold uppercase tracking-[0.18em] text-midnight">Now judging (shown on every judge&rsquo;s screen)</h2>
            {contestants.length === 0 ? (
              <p className="mt-2 text-ink/80">Add students below first.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" className={secondaryButton} disabled={busy || currentIndex <= 0} onClick={() => updateEvent({ currentContestantId: contestants[currentIndex - 1].id })} aria-label="Previous student">
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <label htmlFor="now-judging-select" className="sr-only">Student being judged</label>
                <select
                  id="now-judging-select"
                  value={event.currentContestantId ?? ''}
                  disabled={busy}
                  onChange={(e) => updateEvent({ currentContestantId: e.target.value || null })}
                  className="min-h-12 flex-1 border-2 border-midnight bg-white px-3 font-display text-xl font-semibold text-midnight"
                >
                  <option value="">— Nobody (judges see &ldquo;waiting&rdquo;) —</option>
                  {contestants.map((contestant, index) => (
                    <option key={contestant.id} value={contestant.id}>{index + 1}. {contestant.name}{contestant.project ? ` — ${contestant.project}` : ''}</option>
                  ))}
                </select>
                <button type="button" className={primaryButton} disabled={busy || currentIndex >= contestants.length - 1} onClick={() => updateEvent({ currentContestantId: contestants[currentIndex + 1].id })}>
                  {currentIndex < 0 ? 'Start with first' : 'Next student'} <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            )}
            {current && progress.length ? (
              <div className="mt-4">
                <p className="text-sm font-bold text-midnight">{doneCount} of {progress.length} judges finished {current.name}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {progress.map(({ judge, state }) => (
                    <li key={judge.id} className={`inline-flex items-center gap-1.5 border px-2 py-1 text-sm font-semibold ${state === 'done' ? 'border-green-800/40 bg-green-50 text-green-900' : state === 'started' ? 'border-midnight/30 bg-white/70 text-midnight' : 'border-midnight/15 bg-white/40 text-ink/55'}`}>
                      {state === 'done' ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <CircleDashed className="h-4 w-4" aria-hidden="true" />}
                      {judge.name}
                      <span className="sr-only">: {state === 'done' ? 'finished' : state === 'started' ? 'scoring' : 'not started'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <JudgingTimer
            timer={event.timer}
            contestantName={current?.name}
            busy={busy}
            onControl={(action) => void run(() => sendJson(`${apiBase}/timer`, 'POST', { eventId: event.id, contestantId: event.currentContestantId, action }))}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="students-heading" className="border border-midnight/25 bg-warm p-5">
              <h2 id="students-heading" className="font-display text-lg font-semibold text-midnight">Students ({contestants.length})</h2>
              {contestants.length ? (
                <ol className="mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">
                  {contestants.map((contestant, index) => (
                    <li key={contestant.id} className={`flex items-center gap-2 border px-3 py-2 ${contestant.id === current?.id ? 'border-midnight bg-sky/50' : 'border-midnight/15 bg-white/50'}`}>
                      <span className="w-6 text-sm text-ink/55">{index + 1}.</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-midnight">{contestant.name}</span>
                        {contestant.project ? <span className="block truncate text-xs text-ink/60">{contestant.project}</span> : null}
                      </span>
                      <button
                        type="button"
                        className="inline-flex min-h-9 min-w-9 items-center justify-center text-red-900 hover:bg-red-50"
                        disabled={busy}
                        aria-label={`Remove ${contestant.name}`}
                        onClick={() => window.confirm(`Remove ${contestant.name}? Any scores for them are deleted too.`) && void run(() => sendJson(`${apiBase}/contestants`, 'DELETE', { contestantId: contestant.id }))}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : null}
              <form onSubmit={addStudents} className="mt-4 flex flex-col gap-2">
                <label htmlFor="students-input" className="text-sm font-semibold text-ink/80">
                  Add students <span className="font-normal text-ink/60">(one per line, in pitch order; add a project after a dash)</span>
                </label>
                <textarea id="students-input" value={studentsText} onChange={(e) => setStudentsText(e.target.value)} rows={4} placeholder={'Jay - Solar backpack\nMaya - Recycling robot\nSam'} className={`resize-y ${fieldClass}`} />
                <button type="submit" className={`${secondaryButton} self-start`} disabled={busy || !studentsText.trim()}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add {parseContestantLines(studentsText).length || ''} {parseContestantLines(studentsText).length === 1 ? 'student' : 'students'}
                </button>
              </form>
            </section>

            <section aria-labelledby="judges-heading" className="border border-midnight/25 bg-warm p-5">
              <h2 id="judges-heading" className="font-display text-lg font-semibold text-midnight">Judges ({detail.judges.length})</h2>
              <p className="mt-1 text-sm text-ink/65">Each judge gets a personal code. Read it out, or send their link or QR.</p>
              {detail.judges.length ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {detail.judges.map((judge) => (
                    <JudgeRow
                      key={judge.id}
                      judge={judge}
                      link={`${origin}${judgePath}#code=${judge.accessCode}`}
                      busy={busy}
                      onRemove={() => window.confirm(`Remove ${judge.name}? Their code stops working and their scores are deleted.`) && void run(() => sendJson(`${apiBase}/judges`, 'DELETE', { judgeId: judge.id }))}
                    />
                  ))}
                </ul>
              ) : null}
              <form onSubmit={addJudge} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <label htmlFor="judge-name" className="sr-only">Judge name</label>
                <input id="judge-name" value={judgeName} onChange={(e) => setJudgeName(e.target.value)} maxLength={JUDGING_NAME_MAX} placeholder="Judge name, e.g. Ms. Patel" className="min-h-10 flex-1 border border-midnight/30 bg-white/70 px-3 text-base" />
                <button type="submit" className={secondaryButton} disabled={busy || !judgeName.trim()}>
                  <UserPlus className="h-4 w-4" aria-hidden="true" /> Add judge
                </button>
              </form>
            </section>
          </div>

          <JudgingAudienceControls key={`families-${event.id}`} event={event} demo={demo} onChange={load} />
          <JudgingObsControls key={event.id} eventId={event.id} demo={demo} />
          <JudgingScoreboard detail={detail} />
        </>
      ) : null}

      {snapshot ? (
        <details className="group border border-midnight/25 bg-cream/40">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-warm px-5 py-3 font-display text-lg font-semibold text-midnight focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky [&::-webkit-details-marker]:hidden">
            <span>Past events ({pastEvents.length})</span>
            <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="p-4">
            {pastEvents.length === 0 ? (
              <p className="text-sm text-ink/65">Events you end will appear here with their final scoreboard.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pastEvents.map((past) => (
                  <PastEvent
                    key={past.id}
                    event={past}
                    demo={demo}
                    busy={busy}
                    onMakeLive={() => {
                      const replacing = event ? `\n\n"${event.title}" is open now and will move to Past events.` : ''
                      if (window.confirm(`Reopen "${past.title}" on /judging?${replacing}\n\nScores stay locked until you unlock them.`)) void run(() => sendJson(apiBase, 'PATCH', { eventId: past.id, isCurrent: true }))
                    }}
                    onDelete={() => {
                      if (window.confirm(`Permanently delete "${past.title}" with its ${past.contestantCount} students, ${past.judgeCount} judges, and every score?\n\nDownload the CSVs first if you want to keep them. This cannot be undone.`)) void run(() => sendJson(apiBase, 'DELETE', { eventId: past.id }))
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </details>
      ) : null}
    </div>
  )
}
