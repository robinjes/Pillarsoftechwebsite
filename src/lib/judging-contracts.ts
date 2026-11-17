import { z } from 'zod'

import { normalizeQnaText } from '@/lib/qna-contracts'

// Shared by the unlisted /judging page, the host controls, and their API
// routes. Nothing here is server-only.

export const RUBRIC = [
  { key: 'problem', label: 'Problem + usefulness', prompt: 'Is it a real problem? Would people actually use this?' },
  { key: 'creativity', label: 'Creativity + innovation', prompt: 'Is it new, or a clever twist on something that exists?' },
  { key: 'stem', label: 'STEM connection', prompt: 'Does the STEM make sense? Did you think it through?' },
  { key: 'design', label: 'Design + drawings', prompt: 'Are your designs or drawings clear and labeled?' },
  { key: 'pitch', label: 'Pitch + confidence', prompt: 'Are you clear, confident, and able to answer questions?' },
] as const

export type RubricKey = (typeof RUBRIC)[number]['key']
export const RUBRIC_KEYS = RUBRIC.map((item) => item.key) as RubricKey[]
export const SCORE_MIN = 1
export const SCORE_MAX = 10
export const MAX_TOTAL = RUBRIC.length * SCORE_MAX
export const COMMENT_MAX = 1000
export const JUDGING_NAME_MAX = 80
export const JUDGING_PROJECT_MAX = 120
export const JUDGING_TITLE_MAX = 120

// Access codes skip look-alike characters (0/O, 1/I/L) so they read aloud well.
// Built from ranges rather than spelled out, which also keeps secret scanners
// from mistaking the character set for a key.
const LOOK_ALIKES = new Set(['I', 'L', 'O'])
export const ACCESS_CODE_ALPHABET = [
  ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index)).filter((letter) => !LOOK_ALIKES.has(letter)),
  ...Array.from({ length: 8 }, (_, index) => String(index + 2)),
].join('')
const accessCodePattern = /^[A-HJ-NP-Z2-9]{6}$/

export function normalizeAccessCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidAccessCode(value: string): boolean {
  return accessCodePattern.test(value)
}

export type RubricScores = Record<RubricKey, number | null>

export interface JudgingContestant {
  id: string
  name: string
  project: string
}

export interface JudgingScore extends RubricScores {
  contestantId: string
  comment: string
  updatedAt: string
}

export interface JudgingAdminScore extends JudgingScore {
  judgeId: string
}

export function scoreTotal(scores: RubricScores): number {
  return RUBRIC_KEYS.reduce((sum, key) => sum + (scores[key] ?? 0), 0)
}

export function isScoreComplete(scores: RubricScores): boolean {
  return RUBRIC_KEYS.every((key) => typeof scores[key] === 'number')
}

/** Everything one signed-in judge's screen needs; polled every few seconds. */
export interface JudgeState {
  judge: { id: string; name: string }
  event: { id: string; title: string; scoresLocked: boolean }
  currentContestantId: string | null
  contestants: JudgingContestant[]
  scores: JudgingScore[]
}

export interface JudgingAdminEvent {
  id: string
  title: string
  isCurrent: boolean
  scoresLocked: boolean
  currentContestantId: string | null
  createdAt: string
  contestantCount: number
  judgeCount: number
}

export interface JudgingAdminSnapshot {
  events: JudgingAdminEvent[]
  currentEventId: string | null
}

export interface JudgingJudge {
  id: string
  name: string
  accessCode: string
}

/** One event's contestants, judges (with codes), and every score. */
export interface JudgingEventDetail {
  event: JudgingAdminEvent
  contestants: JudgingContestant[]
  judges: JudgingJudge[]
  scores: JudgingAdminScore[]
}

const text = (min: number, max: number) => z.string().transform(normalizeQnaText).pipe(z.string().min(min).max(max))
const score = z.number().int().min(SCORE_MIN).max(SCORE_MAX).nullable()

export const judgeLoginSchema = z.strictObject({
  code: z.string().max(40).transform(normalizeAccessCode).refine(isValidAccessCode, 'Invalid code'),
})

export const scoreSaveSchema = z.strictObject({
  contestantId: z.uuid(),
  problem: score,
  creativity: score,
  stem: score,
  design: score,
  pitch: score,
  comment: z.string().max(COMMENT_MAX * 2).transform(normalizeQnaText).pipe(z.string().max(COMMENT_MAX)),
})

export const judgingEventCreateSchema = z.strictObject({
  title: text(1, JUDGING_TITLE_MAX),
})

export const judgingEventUpdateSchema = z.strictObject({
  eventId: z.uuid(),
  title: text(1, JUDGING_TITLE_MAX).optional(),
  isCurrent: z.boolean().optional(),
  scoresLocked: z.boolean().optional(),
  currentContestantId: z.uuid().nullable().optional(),
})

export const judgingEventDeleteSchema = z.strictObject({
  eventId: z.uuid(),
})

export const contestantsAddSchema = z.strictObject({
  eventId: z.uuid(),
  entries: z
    .array(z.strictObject({ name: text(1, JUDGING_NAME_MAX), project: z.string().transform(normalizeQnaText).pipe(z.string().max(JUDGING_PROJECT_MAX)).default('') }))
    .min(1)
    .max(100),
})

export const contestantRemoveSchema = z.strictObject({
  contestantId: z.uuid(),
})

export const judgeAddSchema = z.strictObject({
  eventId: z.uuid(),
  name: text(1, JUDGING_NAME_MAX),
})

export const judgeRemoveSchema = z.strictObject({
  judgeId: z.uuid(),
})

/**
 * Parse the host's bulk "add students" box: one per line, with an optional
 * project after a dash, en dash, colon, or pipe ("Jay – Solar backpack").
 */
export function parseContestantLines(text: string): Array<{ name: string; project: string }> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s+[-–—:|]\s+(.+)$/) ?? line.match(/^(.+?)[:|](.+)$/)
      return match ? { name: match[1].trim(), project: match[2].trim() } : { name: line, project: '' }
    })
}
