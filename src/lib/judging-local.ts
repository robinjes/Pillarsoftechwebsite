import { z } from 'zod'
import { COMMENT_MAX, RUBRIC_KEYS, type JudgeState, type JudgingContestant, type RubricScores } from '@/lib/judging-contracts'

export type JudgeDraft = RubricScores & { comment: string }
export interface LocalJudgeDraft {
  contestant: JudgingContestant
  value: JudgeDraft
  revision: string
  pending: boolean
  savedAt: string
}
export const emptyJudgeDraft = (): JudgeDraft => ({ problem: null, creativity: null, stem: null, design: null, pitch: null, comment: '' })
const id = z.string().min(1).max(100)
const score = z.number().int().min(1).max(10).nullable()
const rubric = z.object({ problem: score, creativity: score, stem: score, design: score, pitch: score, comment: z.string().max(COMMENT_MAX) })
const contestant = z.object({ id, name: z.string().max(80), project: z.string().max(120) })
const localDraft = z.object({ contestant, value: rubric, revision: z.string().min(1).max(100), pending: z.boolean(), savedAt: z.string() })
// Allowlist only a judge's own state. Never store login codes or cookies.
const snapshot = z.object({
  judge: z.object({ id, name: z.string().max(80) }),
  event: z.object({ id, title: z.string().max(120), scoresLocked: z.boolean() }),
  currentContestantId: id.nullable(),
  contestants: z.array(contestant).max(500),
  scores: z.array(rubric.extend({ contestantId: id, updatedAt: z.string() })).max(500),
})
const PREFIX = 'pot:judge-backup:v1:'
export function judgeBackupKey(state: JudgeState, demo: boolean) {
  return `${PREFIX}${demo ? 'demo' : 'live'}:${encodeURIComponent(state.judge.id)}:${encodeURIComponent(state.event.id)}`
}
const activeKey = (demo: boolean) => `${PREFIX}active:${demo ? 'demo' : 'live'}`
function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}
function write(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true } catch { return false }
}
export function rememberJudgeState(state: JudgeState, demo: boolean): boolean {
  const key = judgeBackupKey(state, demo)
  const safe = snapshot.safeParse(state)
  return safe.success && write(`${key}:state`, safe.data) && write(activeKey(demo), key)
}
export function forgetActiveJudge(demo: boolean) {
  try { localStorage.removeItem(activeKey(demo)) } catch { /* The drafts themselves remain recoverable. */ }
}
export function readLastJudgeState(demo: boolean): JudgeState | null {
  const key = read(activeKey(demo))
  if (typeof key !== 'string' || !key.startsWith(`${PREFIX}${demo ? 'demo' : 'live'}:`)) return null
  const parsed = snapshot.safeParse(read(`${key}:state`))
  return parsed.success && judgeBackupKey(parsed.data, demo) === key ? parsed.data : null
}
const draftKey = (state: JudgeState, demo: boolean, contestantId: string) => `${judgeBackupKey(state, demo)}:draft:${encodeURIComponent(contestantId)}`
export function storeJudgeDraft(state: JudgeState, demo: boolean, entry: LocalJudgeDraft): boolean {
  return write(draftKey(state, demo, entry.contestant.id), entry)
}
export function readJudgeDrafts(state: JudgeState, demo: boolean): Record<string, LocalJudgeDraft> {
  const result: Record<string, LocalJudgeDraft> = {}
  const prefix = `${judgeBackupKey(state, demo)}:draft:`
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (!key?.startsWith(prefix)) continue
      const parsed = localDraft.safeParse(read(key))
      if (parsed.success && draftKey(state, demo, parsed.data.contestant.id) === key) result[parsed.data.contestant.id] = parsed.data
    }
  } catch { /* In-memory drafts remain usable when browser storage is blocked. */ }
  return result
}
/** An old request/tab must never mark a newer local edit as synchronized. */
export function acknowledgeJudgeDraft(state: JudgeState, demo: boolean, sent: LocalJudgeDraft): boolean {
  const key = draftKey(state, demo, sent.contestant.id)
  const existing = localDraft.safeParse(read(key))
  if (existing.success && existing.data.revision !== sent.revision) return true
  return write(key, { ...sent, pending: false })
}
export function draftFromScore(score: RubricScores & { comment: string }): JudgeDraft {
  return { ...Object.fromEntries(RUBRIC_KEYS.map((key) => [key, score[key]])) as RubricScores, comment: score.comment }
}
