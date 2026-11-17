'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RUBRIC_KEYS, type JudgeState, type JudgingScore } from '@/lib/judging-contracts'
import {
  acknowledgeJudgeDraft, draftFromScore, emptyJudgeDraft, forgetActiveJudge, judgeBackupKey,
  readJudgeDrafts, readLastJudgeState, rememberJudgeState, storeJudgeDraft,
  type JudgeDraft, type LocalJudgeDraft,
} from '@/lib/judging-local'
import { usePolling } from '../qna/qna-client'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'locked' | 'removed'

async function request(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try { return await fetch(url, { ...init, signal: controller.signal }) }
  finally { clearTimeout(timeout) }
}

export function useJudgeScoring(demo: boolean) {
  const apiBase = demo ? '/api/dev/judging/judge' : '/api/judging'
  const [state, setState] = useState<JudgeState | null>(null)
  const [signedOut, setSignedOut] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})
  const active = useRef<JudgeState | null>(null)
  const entries = useRef<Record<string, LocalJudgeDraft>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const inFlight = useRef(new Set<string>())
  const mounted = useRef(true)
  const verified = useRef(false)
  const authRequired = useRef(false)
  const loading = useRef(false)
  const authEpoch = useRef(0)
  const epoch = useRef(0)
  const changedAt = useRef<Record<string, number>>({})
  const saveRef = useRef<(id: string) => Promise<void>>(async () => {})

  const hydrate = useCallback((next: JudgeState) => {
    Object.values(timers.current).forEach(clearTimeout)
    timers.current = {}
    entries.current = readJudgeDrafts(next, demo)
    for (const score of next.scores) if (!entries.current[score.contestantId]) {
      const student = next.contestants.find((item) => item.id === score.contestantId)
      if (student) entries.current[score.contestantId] = { contestant: student, value: draftFromScore(score), revision: crypto.randomUUID(), pending: false, savedAt: score.updatedAt }
    }
    changedAt.current = {}
    setSaveStatus(Object.fromEntries(Object.values(entries.current).map((entry) => [entry.contestant.id, entry.pending ? 'error' : 'saved'])))
    active.current = next
  }, [demo])

  const requireLogin = useCallback(() => {
    authEpoch.current++
    verified.current = false
    authRequired.current = true
    if (!active.current) {
      const cached = readLastJudgeState(demo)
      if (cached) hydrate(cached)
    }
    setSignedOut(true)
    setState(null)
  }, [demo, hydrate])

  const save = useCallback(async (contestantId: string) => {
    const session = active.current
    const entry = entries.current[contestantId]
    if (!mounted.current || !session || !entry?.pending || !verified.current || authRequired.current) return
    const key = judgeBackupKey(session, demo)
    const sessionEpoch = authEpoch.current
    const flightKey = `${key}:${contestantId}`
    if (inFlight.current.has(flightKey)) return
    if (session.event.scoresLocked || !session.contestants.some((student) => student.id === contestantId)) {
      setSaveStatus((current) => ({ ...current, [contestantId]: session.event.scoresLocked ? 'locked' : 'removed' }))
      return
    }
    inFlight.current.add(flightKey)
    setSaveStatus((current) => ({ ...current, [contestantId]: 'saving' }))
    const sameSession = () => mounted.current && authEpoch.current === sessionEpoch && active.current && judgeBackupKey(active.current, demo) === key
    try {
      const response = await request(`${apiBase}/scores`, {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contestantId, ...entry.value, session: { judgeId: session.judge.id, eventId: session.event.id } }),
      })
      if (!sameSession()) return
      const result = await response.json().catch(() => ({})) as { locked?: boolean; error?: string; score?: JudgingScore }
      if (!sameSession()) return
      if (response.status === 401 || result.error === 'session_changed') { requireLogin(); return }
      if (result.locked || response.status === 404) {
        setSaveStatus((current) => ({ ...current, [contestantId]: result.locked ? 'locked' : 'removed' }))
        return
      }
      if (!response.ok || result.score?.contestantId !== contestantId || typeof result.score.comment !== 'string' || !RUBRIC_KEYS.every((key) => result.score?.[key] === entry.value[key])) throw new Error('save_failed')
      if (!acknowledgeJudgeDraft(session, demo, entry)) setStorageError(true)
      if (entries.current[contestantId]?.revision === entry.revision) {
        entries.current[contestantId] = { ...entry, pending: false }
        changedAt.current[contestantId] = ++epoch.current
        setSaveStatus((current) => ({ ...current, [contestantId]: 'saved' }))
      }
    } catch {
      if (!sameSession()) return
      verified.current = false
      setLoadError(true)
      setSaveStatus((current) => ({ ...current, [contestantId]: 'error' }))
    } finally {
      inFlight.current.delete(flightKey)
      if (sameSession() && verified.current && !authRequired.current && entries.current[contestantId]?.pending && entries.current[contestantId].revision !== entry.revision) {
        clearTimeout(timers.current[contestantId])
        timers.current[contestantId] = setTimeout(() => void saveRef.current(contestantId), 0)
      }
    }
  }, [apiBase, demo, requireLogin])
  saveRef.current = save

  const load = useCallback(async () => {
    if (loading.current || authRequired.current) return
    loading.current = true
    const requestAuthEpoch = authEpoch.current
    const requestedAt = epoch.current
    try {
      const response = await request(`${apiBase}/state`, { cache: 'no-store' })
      if (!mounted.current || authRequired.current || authEpoch.current !== requestAuthEpoch) return
      if (response.status === 401) { requireLogin(); return }
      if (!response.ok) throw new Error('unavailable')
      const next = await response.json() as JudgeState
      if (!mounted.current || authRequired.current || authEpoch.current !== requestAuthEpoch) return
      if (!active.current || judgeBackupKey(active.current, demo) !== judgeBackupKey(next, demo)) hydrate(next)
      // Pick up a newer queued draft from another tab without letting a
      // stale acknowledgement erase it.
      for (const [id, disk] of Object.entries(readJudgeDrafts(next, demo))) {
        const current = entries.current[id]
        if (disk.pending && (!current || (disk.revision !== current.revision && disk.savedAt >= current.savedAt))) entries.current[id] = disk
      }
      // A GET started before an edit/save must not overwrite that newer value.
      for (const student of next.contestants) {
        const id = student.id
        const score = next.scores.find((item) => item.contestantId === id)
        if ((score || entries.current[id]) && !entries.current[id]?.pending && (changedAt.current[id] ?? 0) <= requestedAt) {
          entries.current[id] = { contestant: student, value: score ? draftFromScore(score) : emptyJudgeDraft(), revision: crypto.randomUUID(), pending: false, savedAt: score?.updatedAt ?? new Date().toISOString() }
        }
      }
      active.current = next
      verified.current = true
      const cached = rememberJudgeState(next, demo)
      setStorageError((failed) => failed || !cached)
      setState(next)
      setSignedOut(false)
      setLoadError(false)
      for (const entry of Object.values(entries.current)) if (entry.pending) void saveRef.current(entry.contestant.id)
    } catch {
      if (!mounted.current || authRequired.current || authEpoch.current !== requestAuthEpoch) return
      verified.current = false
      setLoadError(true)
      if (!active.current) {
        const cached = readLastJudgeState(demo)
        if (cached) {
          hydrate(cached)
          setState(cached)
        }
      }
    } finally { loading.current = false }
  }, [apiBase, demo, hydrate, requireLogin])
  usePolling(load, 2_500)

  useEffect(() => {
    mounted.current = true
    const online = () => { void load() }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (Object.values(entries.current).some((entry) => entry.pending)) event.preventDefault()
    }
    window.addEventListener('online', online)
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      mounted.current = false
      Object.values(timers.current).forEach(clearTimeout)
      window.removeEventListener('online', online)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [load])

  const updateDraft = useCallback((contestantId: string, patch: Partial<JudgeDraft>, delay: number) => {
    const session = active.current
    const student = session?.contestants.find((item) => item.id === contestantId)
    if (!session || !student || session.event.scoresLocked) return
    const entry: LocalJudgeDraft = { contestant: student, value: { ...(entries.current[contestantId]?.value ?? emptyJudgeDraft()), ...patch }, revision: crypto.randomUUID(), pending: true, savedAt: new Date().toISOString() }
    entries.current[contestantId] = entry
    changedAt.current[contestantId] = ++epoch.current
    // Persist synchronously before the network request or comment debounce.
    const snapshotSaved = rememberJudgeState(session, demo)
    const draftSaved = storeJudgeDraft(session, demo, entry)
    setStorageError((failed) => failed || !snapshotSaved || !draftSaved)
    setSaveStatus((current) => ({ ...current, [contestantId]: verified.current ? 'saving' : 'error' }))
    clearTimeout(timers.current[contestantId])
    timers.current[contestantId] = setTimeout(() => void saveRef.current(contestantId), delay)
  }, [demo])

  async function signOut() {
    if (Object.values(entries.current).some((entry) => entry.pending) && !window.confirm('Scores are waiting to sync. Their local backup will stay on this device. Sign out?')) return
    requireLogin()
    forgetActiveJudge(demo)
    Object.values(timers.current).forEach(clearTimeout)
    await request(`${apiBase}/session`, { method: 'DELETE' }).catch(() => undefined)
  }
  function downloadBackup() {
    const session = active.current
    if (!session) return
    const all = readJudgeDrafts(session, demo)
    for (const [id, memory] of Object.entries(entries.current)) {
      const disk = all[id]
      if (!disk || (!disk.pending && memory.pending) || (disk.pending === memory.pending && memory.savedAt >= disk.savedAt) || (!disk.pending && !memory.pending)) all[id] = memory
    }
    const backup = { version: 1, exportedAt: new Date().toISOString(), judge: session.judge, event: { id: session.event.id, title: session.event.title }, scores: Object.values(all).map((entry) => ({ student: entry.contestant, ...entry.value, waitingToSync: entry.pending, savedAt: entry.savedAt })) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = 'judging-score-backup.json'; link.click()
    URL.revokeObjectURL(url)
  }
  return {
    apiBase, state, signedOut, loadError, storageError, saveStatus, updateDraft, signOut, downloadBackup,
    hasBackup: !!active.current,
    backupOwner: active.current ? `${active.current.judge.name} · ${active.current.event.title}` : '',
    pendingCount: Object.values(entries.current).filter((entry) => entry.pending).length,
    draftFor: (id: string) => entries.current[id]?.value ?? emptyJudgeDraft(),
    onSignedIn: () => { authEpoch.current++; authRequired.current = false; setSignedOut(false); void load() },
  }
}
