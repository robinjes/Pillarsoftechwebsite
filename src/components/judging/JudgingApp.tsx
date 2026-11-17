'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, CheckCircle2, CircleDashed, Gavel, Home, Lock, LogOut, Radio } from 'lucide-react'

import {
  COMMENT_MAX,
  isScoreComplete,
  MAX_TOTAL,
  RUBRIC,
  RUBRIC_KEYS,
  scoreTotal,
  type JudgeState,
  type JudgingContestant,
  type RubricKey,
  type RubricScores,
} from '@/lib/judging-contracts'

import { usePolling } from '../qna/qna-client'

const POLL_MS = 2_500
const COMMENT_SAVE_DELAY_MS = 800
const RETRY_MS = 3_000

type View = { kind: 'current' } | { kind: 'home' } | { kind: 'review'; contestantId: string }
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'locked'
type Draft = RubricScores & { comment: string }

const emptyDraft = (): Draft => ({ problem: null, creativity: null, stem: null, design: null, pitch: null, comment: '' })

function codeFromHash(): string | null {
  const match = window.location.hash.match(/code=([A-Za-z0-9-]+)/)
  return match ? match[1] : null
}

export default function JudgingApp() {
  const [state, setState] = useState<JudgeState | null>(null)
  const [signedOut, setSignedOut] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState<View>({ kind: 'current' })
  const [toast, setToast] = useState('')
  const [, rerender] = useState(0)

  // Drafts live in a ref so autosave timers always send the latest values,
  // even after the host moves everyone to the next student.
  const drafts = useRef<Record<string, Draft>>({})
  const versions = useRef<Record<string, number>>({})
  const dirty = useRef<Record<string, number>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})
  const lastCurrent = useRef<string | null | undefined>(undefined)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/judging/state', { cache: 'no-store' })
      if (response.status === 401) {
        setState(null)
        setSignedOut(true)
        return
      }
      if (!response.ok) throw new Error('unavailable')
      const next = (await response.json()) as JudgeState
      // Server scores fill in anything without unsaved local edits.
      for (const score of next.scores) {
        if (!dirty.current[score.contestantId]) {
          drafts.current[score.contestantId] = { ...RUBRIC_KEYS.reduce((acc, key) => ({ ...acc, [key]: score[key] }), {} as RubricScores), comment: score.comment }
        }
      }
      setState(next)
      setSignedOut(false)
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [])

  usePolling(load, POLL_MS)

  // Follow the host: when they pick a new student, every judge jumps to it.
  useEffect(() => {
    if (!state) return
    const current = state.currentContestantId
    if (lastCurrent.current === undefined) {
      lastCurrent.current = current
      setView(current ? { kind: 'current' } : { kind: 'home' })
      return
    }
    if (current !== lastCurrent.current) {
      lastCurrent.current = current
      if (current) {
        const name = state.contestants.find((contestant) => contestant.id === current)?.name
        setView({ kind: 'current' })
        setToast(`Now judging ${name ?? 'the next student'}`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setView({ kind: 'home' })
      }
    }
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 4_000)
    return () => clearTimeout(timer)
  }, [toast])

  // Warn before closing the tab with an unsaved score.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (Object.values(dirty.current).some(Boolean)) event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const save = useCallback(async (contestantId: string) => {
    const draft = drafts.current[contestantId]
    const version = versions.current[contestantId] ?? 0
    if (!draft) return
    setSaveStatus((current) => ({ ...current, [contestantId]: 'saving' }))
    try {
      const response = await fetch('/api/judging/scores', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contestantId, ...draft }),
      })
      if (response.status === 401) {
        setSignedOut(true)
        return
      }
      const result = (await response.json().catch(() => ({}))) as { locked?: boolean }
      if (result.locked) {
        dirty.current[contestantId] = 0
        setSaveStatus((current) => ({ ...current, [contestantId]: 'locked' }))
        return
      }
      if (response.status === 404) {
        dirty.current[contestantId] = 0
        setSaveStatus((current) => ({ ...current, [contestantId]: 'error' }))
        return
      }
      if (!response.ok) throw new Error('save_failed')
      // Only clear the dirty flag if nothing changed while this save was in flight.
      if ((versions.current[contestantId] ?? 0) === version) dirty.current[contestantId] = 0
      setSaveStatus((current) => ({ ...current, [contestantId]: dirty.current[contestantId] ? 'saving' : 'saved' }))
    } catch {
      setSaveStatus((current) => ({ ...current, [contestantId]: 'error' }))
      clearTimeout(timers.current[contestantId])
      timers.current[contestantId] = setTimeout(() => void save(contestantId), RETRY_MS)
    }
  }, [])

  const updateDraft = useCallback((contestantId: string, patch: Partial<Draft>, delay: number) => {
    drafts.current[contestantId] = { ...(drafts.current[contestantId] ?? emptyDraft()), ...patch }
    versions.current[contestantId] = (versions.current[contestantId] ?? 0) + 1
    dirty.current[contestantId] = versions.current[contestantId]
    setSaveStatus((current) => ({ ...current, [contestantId]: 'saving' }))
    rerender((value) => value + 1)
    clearTimeout(timers.current[contestantId])
    timers.current[contestantId] = setTimeout(() => void save(contestantId), delay)
  }, [save])

  async function signOut() {
    if (Object.values(dirty.current).some(Boolean) && !window.confirm('A score is still saving. Sign out anyway?')) return
    await fetch('/api/judging/session', { method: 'DELETE' }).catch(() => undefined)
    drafts.current = {}
    dirty.current = {}
    lastCurrent.current = undefined
    setState(null)
    setSignedOut(true)
  }

  if (signedOut) {
    return <SignIn onSignedIn={() => { setSignedOut(false); void load() }} />
  }

  if (!state) {
    return (
      <Shell>
        <p role={loadError ? 'alert' : 'status'} className="border border-midnight/20 bg-warm p-6 text-ink/75">
          {loadError ? 'We could not reach judging. Check your connection; this page keeps retrying.' : 'Loading…'}
        </p>
      </Shell>
    )
  }

  const byId = new Map(state.contestants.map((contestant) => [contestant.id, contestant]))
  const current = state.currentContestantId ? byId.get(state.currentContestantId) ?? null : null
  const openId = view.kind === 'current' ? current?.id ?? null : view.kind === 'review' ? view.contestantId : null
  const open = openId ? byId.get(openId) ?? null : null
  const draftFor = (id: string) => drafts.current[id] ?? emptyDraft()

  return (
    <Shell
      title={state.event.title}
      judgeName={state.judge.name}
      onHome={view.kind === 'home' ? undefined : () => setView({ kind: 'home' })}
    >
      {toast ? (
        <p role="status" className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-2 border-2 border-midnight bg-sun px-4 py-3 font-bold text-midnight shadow-[4px_4px_0_#0D2B4A]">
          <Radio className="h-5 w-5" aria-hidden="true" /> {toast}
        </p>
      ) : null}
      {loadError ? <p role="status" className="mb-3 text-sm font-semibold text-red-900">Reconnecting…</p> : null}
      {state.event.scoresLocked ? (
        <p className="mb-4 flex items-center gap-2 border border-midnight/30 bg-white/60 p-3 text-sm font-semibold text-ink">
          <Lock className="h-4 w-4" aria-hidden="true" /> Scores are locked. You can still look at them.
        </p>
      ) : null}

      {view.kind === 'home' || !open ? (
        <HomeScreen
          state={state}
          current={current}
          draftFor={draftFor}
          onOpen={(id) => setView(id === current?.id ? { kind: 'current' } : { kind: 'review', contestantId: id })}
          onSignOut={signOut}
          waiting={view.kind !== 'home' && !open}
        />
      ) : (
        <Rubric
          key={open.id}
          contestant={open}
          isCurrent={open.id === current?.id}
          draft={draftFor(open.id)}
          status={saveStatus[open.id] ?? 'idle'}
          locked={state.event.scoresLocked}
          onScore={(key, value) => updateDraft(open.id, { [key]: value }, 0)}
          onComment={(comment) => updateDraft(open.id, { comment }, COMMENT_SAVE_DELAY_MS)}
          onHome={() => setView({ kind: 'home' })}
          currentName={current && current.id !== open.id ? current.name : null}
          onGoCurrent={() => setView({ kind: 'current' })}
        />
      )}
    </Shell>
  )
}

function Shell({ title, judgeName, onHome, children }: { title?: string; judgeName?: string; onHome?: () => void; children: React.ReactNode }) {
  return (
    <main className="min-h-[100svh] bg-cream px-4 pb-24 pt-5 text-ink sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-midnight bg-sky text-midnight" aria-hidden="true">
            <Gavel className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Pillars of Tech · Judging</p>
            <p className="line-clamp-2 font-display text-xl font-semibold leading-tight text-midnight">{title ?? 'Judging'}</p>
            {judgeName ? <p className="truncate text-sm text-ink/65">Judge: {judgeName}</p> : null}
          </div>
          {onHome ? (
            <button
              type="button"
              onClick={onHome}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-midnight bg-warm px-3 text-sm font-bold text-midnight hover:bg-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky"
            >
              <Home className="h-5 w-5" aria-hidden="true" /> Home
            </button>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  )
}

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const tried = useRef(false)

  const submit = useCallback(async (value: string) => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/judging/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: value }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'That code didn’t work.')
      onSignedIn()
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'That code didn’t work.')
    } finally {
      setBusy(false)
    }
  }, [onSignedIn])

  // A judge's personal QR code carries their code after "#", which never
  // reaches server logs; use it once and remove it from the address bar.
  useEffect(() => {
    if (tried.current) return
    tried.current = true
    const fromLink = codeFromHash()
    if (!fromLink) return
    history.replaceState(null, '', window.location.pathname)
    setCode(fromLink.toUpperCase())
    void submit(fromLink)
  }, [submit])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.trim()) void submit(code)
  }

  return (
    <Shell>
      <form onSubmit={onSubmit} className="border border-midnight/25 bg-warm p-6 shadow-[6px_6px_0_#0D2B4A]">
        <h1 className="font-display text-2xl font-semibold text-midnight">Judge sign-in</h1>
        <p className="mt-1 text-ink/70">Enter the 6-character code from the event host.</p>
        <label htmlFor="judge-code" className="sr-only">Judge code</label>
        <input
          id="judge-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 12))}
          autoCapitalize="characters"
          autoComplete="one-time-code"
          spellCheck={false}
          placeholder="ABC234"
          className="mt-4 w-full border-2 border-midnight/40 bg-white px-4 py-3 text-center font-mono text-3xl tracking-[0.3em] text-midnight focus:border-midnight focus:outline-hidden focus:ring-2 focus:ring-sky"
        />
        {error ? <p role="alert" className="mt-3 text-sm font-semibold text-red-900">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          aria-busy={busy}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-midnight bg-midnight px-5 text-lg font-bold text-warm hover:bg-cobalt focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Start judging'}
        </button>
      </form>
    </Shell>
  )
}

function ScoreStatus({ draft }: { draft: Draft }) {
  const scored = RUBRIC_KEYS.filter((key) => typeof draft[key] === 'number').length
  return isScoreComplete(draft) ? (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-green-800"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Complete</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink/60"><CircleDashed className="h-4 w-4" aria-hidden="true" /> {scored} of {RUBRIC.length} scored</span>
  )
}

function HomeScreen({
  state,
  current,
  draftFor,
  onOpen,
  onSignOut,
  waiting,
}: {
  state: JudgeState
  current: JudgingContestant | null
  draftFor: (id: string) => Draft
  onOpen: (id: string) => void
  onSignOut: () => void
  waiting: boolean
}) {
  const updated = new Map(state.scores.map((score) => [score.contestantId, score.updatedAt]))
  const touched = (id: string) => updated.has(id) || RUBRIC_KEYS.some((key) => draftFor(id)[key] !== null) || draftFor(id).comment !== ''
  const judged = state.contestants
    .filter((contestant) => touched(contestant.id))
    .sort((a, b) => (updated.get(b.id) ?? '￿').localeCompare(updated.get(a.id) ?? '￿'))
  const notYet = state.contestants.filter((contestant) => !touched(contestant.id))

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="now-judging" className="border-2 border-midnight bg-sky p-5">
        <p id="now-judging" className="font-display text-xs font-bold uppercase tracking-[0.18em] text-midnight">Now judging</p>
        {current ? (
          <>
            <p className="mt-1 font-display text-3xl font-semibold leading-tight text-midnight">{current.name}</p>
            {current.project ? <p className="text-ink/75">{current.project}</p> : null}
            <button
              type="button"
              onClick={() => onOpen(current.id)}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-midnight bg-midnight px-5 text-lg font-bold text-warm hover:bg-cobalt focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 sm:w-auto"
            >
              Go to rubric <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : (
          <p className="mt-1 text-lg text-ink/80">{waiting ? 'Waiting for the host to pick the next student…' : 'No student is up right now. This screen updates on its own.'}</p>
        )}
      </section>

      <section aria-labelledby="your-scores">
        <h2 id="your-scores" className="font-display text-xl font-semibold text-midnight">Your scores</h2>
        {judged.length === 0 ? (
          <p className="mt-2 text-ink/65">Students you score will appear here, newest first.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {judged.map((contestant) => {
              const draft = draftFor(contestant.id)
              return (
                <li key={contestant.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(contestant.id)}
                    className="flex min-h-14 w-full items-center gap-3 border border-midnight/25 bg-warm px-4 py-3 text-left hover:border-midnight focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-semibold text-midnight">{contestant.name}</span>
                      <ScoreStatus draft={draft} />
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="font-display text-2xl font-semibold text-midnight">{scoreTotal(draft)}</span>
                      <span className="text-sm text-ink/60"> / {MAX_TOTAL}</span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-midnight" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {notYet.length ? (
        <section aria-labelledby="not-yet">
          <h2 id="not-yet" className="font-display text-lg font-semibold text-midnight">Not scored yet</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {notYet.map((contestant) => (
              <li key={contestant.id}>
                <button type="button" onClick={() => onOpen(contestant.id)} className="min-h-10 border border-midnight/20 bg-white/50 px-3 text-sm text-ink/80 hover:border-midnight/60">
                  {contestant.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button type="button" onClick={onSignOut} className="inline-flex min-h-10 items-center gap-2 self-start text-sm font-semibold text-ink/60 underline hover:text-ink">
        <LogOut className="h-4 w-4" aria-hidden="true" /> Not {state.judge.name}? Sign out
      </button>
    </div>
  )
}

const statusText: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved yet. Retrying…',
  locked: 'Scores are locked',
}

function Rubric({
  contestant,
  isCurrent,
  draft,
  status,
  locked,
  onScore,
  onComment,
  onHome,
  currentName,
  onGoCurrent,
}: {
  contestant: JudgingContestant
  isCurrent: boolean
  draft: Draft
  status: SaveStatus
  locked: boolean
  onScore: (key: RubricKey, value: number) => void
  onComment: (comment: string) => void
  onHome: () => void
  currentName: string | null
  onGoCurrent: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {currentName ? (
        <button type="button" onClick={onGoCurrent} className="flex min-h-11 items-center justify-between gap-2 border-2 border-midnight bg-sun px-4 py-2 text-left font-bold text-midnight">
          <span>Now judging: {currentName}</span>
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}

      <section className="border border-midnight/25 bg-warm p-5">
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">{isCurrent ? 'Now judging' : 'Reviewing your score'}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-midnight">{contestant.name}</h1>
        {contestant.project ? <p className="text-ink/75">{contestant.project}</p> : null}
      </section>

      {RUBRIC.map((item) => (
        <fieldset key={item.key} className="border border-midnight/25 bg-warm p-4">
          <legend className="sr-only">{item.label}</legend>
          <div className="flex items-baseline justify-between gap-3">
            <p aria-hidden="true" className="font-display text-lg font-semibold text-midnight">{item.label}</p>
            <p className="shrink-0 font-display text-lg font-semibold text-midnight">{draft[item.key] ?? '–'}<span className="text-sm text-ink/55"> / 10</span></p>
          </div>
          <p className="text-sm text-ink/70">{item.prompt}</p>
          <div role="radiogroup" aria-label={`${item.label}, 1 to 10`} className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => {
              const selected = draft[item.key] === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${value}`}
                  disabled={locked}
                  onClick={() => onScore(item.key, value)}
                  className={`min-h-12 border text-lg font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky disabled:cursor-not-allowed ${selected ? 'border-midnight bg-midnight text-warm' : 'border-midnight/25 bg-white/70 text-midnight hover:border-midnight'}`}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      <label className="block border border-midnight/25 bg-warm p-4">
        <span className="font-display text-lg font-semibold text-midnight">Comments <span className="font-body text-sm font-normal text-ink/60">(optional, only the hosts see these)</span></span>
        <textarea
          value={draft.comment}
          onChange={(event) => onComment(event.target.value.slice(0, COMMENT_MAX))}
          maxLength={COMMENT_MAX}
          rows={3}
          disabled={locked}
          className="mt-2 w-full resize-y border border-midnight/30 bg-white/70 px-3 py-2 text-base text-ink focus:border-midnight focus:outline-hidden focus:ring-2 focus:ring-sky disabled:opacity-70"
        />
      </label>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-midnight bg-warm/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <p className="font-display text-2xl font-semibold text-midnight">
            {scoreTotal(draft)}<span className="text-base text-ink/60"> / {MAX_TOTAL}</span>
          </p>
          <div className="min-w-0 flex-1 text-sm">
            <ScoreStatus draft={draft} />
            <p role="status" aria-live="polite" className={status === 'error' ? 'font-semibold text-red-900' : 'text-ink/60'}>{statusText[status]}</p>
          </div>
          <button type="button" onClick={onHome} className="inline-flex min-h-11 items-center gap-2 border border-midnight bg-midnight px-4 font-bold text-warm hover:bg-cobalt">
            <Home className="h-5 w-5" aria-hidden="true" /> Home
          </button>
        </div>
      </div>
    </div>
  )
}
