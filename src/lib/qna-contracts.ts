import { z } from 'zod'

// Shared by the unlisted /qna audience page, the host controls, and their API
// routes. Nothing here is server-only; the visitor token is an anonymous,
// device-local random value used only to dedupe votes and bucket rate limits.

export const QNA_VISITOR_HEADER = 'x-qna-visitor'
export const QNA_VISITOR_STORAGE_KEY = 'pot-qna-visitor'
export const QNA_UPVOTES_STORAGE_KEY = 'pot-qna-upvotes'

export const QNA_QUESTION_MIN = 3
export const QNA_QUESTION_MAX = 300
export const QNA_NAME_MAX = 60
export const QNA_TITLE_MAX = 120

const visitorTokenPattern = /^[A-Za-z0-9_-]{43}$/

export function isValidQnaVisitorToken(value: unknown): value is string {
  return typeof value === 'string' && visitorTokenPattern.test(value)
}

/** Collapse whitespace and drop control characters before length checks. */
export function normalizeQnaText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const qnaText = (min: number, max: number) => z.string().transform(normalizeQnaText).pipe(z.string().min(min).max(max))

export const qnaQuestionSubmissionSchema = z.strictObject({
  body: qnaText(QNA_QUESTION_MIN, QNA_QUESTION_MAX),
  authorName: z
    .string()
    .max(200)
    .optional()
    .transform((value) => {
      const normalized = value ? normalizeQnaText(value).replace(/\s+/g, ' ') : ''
      return normalized ? normalized.slice(0, QNA_NAME_MAX) : null
    }),
})

export const qnaUpvoteSchema = z.strictObject({
  upvoted: z.boolean(),
})

export const qnaQuestionStatusSchema = z.enum(['live', 'answered', 'hidden'])
export type QnaQuestionStatus = z.infer<typeof qnaQuestionStatusSchema>

export const qnaAdminSessionCreateSchema = z.strictObject({
  title: qnaText(1, QNA_TITLE_MAX),
  makeCurrent: z.boolean().optional().default(true),
})

export const qnaAdminSessionUpdateSchema = z.strictObject({
  sessionId: z.uuid(),
  title: qnaText(1, QNA_TITLE_MAX).optional(),
  isCurrent: z.boolean().optional(),
  acceptingQuestions: z.boolean().optional(),
  highlightedQuestionId: z.uuid().nullable().optional(),
})

export const qnaAdminQuestionUpdateSchema = z.strictObject({
  questionId: z.uuid(),
  status: qnaQuestionStatusSchema,
})

export interface QnaPublicSession {
  id: string
  title: string
  acceptingQuestions: boolean
  highlightedQuestionId: string | null
}

export interface QnaPublicQuestion {
  id: string
  body: string
  authorName: string | null
  upvotes: number
  answered: boolean
  createdAt: string
}

export interface QnaPublicSnapshot {
  session: QnaPublicSession | null
  questions: QnaPublicQuestion[]
}

export interface QnaAdminSession extends QnaPublicSession {
  isCurrent: boolean
  createdAt: string
}

export interface QnaAdminQuestion extends Omit<QnaPublicQuestion, 'answered'> {
  status: QnaQuestionStatus
}

export interface QnaAdminSnapshot {
  sessions: QnaAdminSession[]
  selectedSessionId: string | null
  questions: QnaAdminQuestion[]
}

export type QnaSort = 'popular' | 'recent'

export function sortQnaQuestions<T extends { upvotes: number; createdAt: string }>(questions: T[], sort: QnaSort): T[] {
  return [...questions].sort((a, b) => {
    if (sort === 'popular' && b.upvotes !== a.upvotes) return b.upvotes - a.upvotes
    return b.createdAt.localeCompare(a.createdAt)
  })
}
