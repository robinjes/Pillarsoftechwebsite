import { z } from 'zod'

import { normalizeQnaText } from '@/lib/qna-contracts'

// Shared by the unlisted /feedback form, the host editor and results, and
// their API routes. Nothing here is server-only.

export const FEEDBACK_SUBMITTED_STORAGE_KEY = 'pot-feedback-submitted'

export const FEEDBACK_KINDS = ['rating', 'single_choice', 'multi_choice', 'short_text', 'long_text'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  rating: 'Star rating (1–5)',
  single_choice: 'Multiple choice (pick one)',
  multi_choice: 'Checkboxes (pick any)',
  short_text: 'Short answer',
  long_text: 'Paragraph',
}

export const FEEDBACK_MAX_QUESTIONS = 30
export const FEEDBACK_MAX_OPTIONS = 20
export const FEEDBACK_PROMPT_MAX = 300
export const FEEDBACK_OPTION_MAX = 100
export const FEEDBACK_SHORT_TEXT_MAX = 200
export const FEEDBACK_LONG_TEXT_MAX = 2000
export const FEEDBACK_TITLE_MAX = 120
export const FEEDBACK_INTRO_MAX = 600
export const FEEDBACK_NAME_MAX = 80

export function isChoiceKind(kind: FeedbackKind): boolean {
  return kind === 'single_choice' || kind === 'multi_choice'
}

const text = (min: number, max: number) => z.string().transform(normalizeQnaText).pipe(z.string().min(min).max(max))

export const feedbackQuestionInputSchema = z
  .strictObject({
    id: z.uuid().optional(),
    kind: z.enum(FEEDBACK_KINDS),
    prompt: text(1, FEEDBACK_PROMPT_MAX),
    required: z.boolean().default(false),
    options: z.array(text(1, FEEDBACK_OPTION_MAX)).max(FEEDBACK_MAX_OPTIONS).default([]),
  })
  .transform((question) => ({
    ...question,
    // Only choice questions keep options; duplicates would make results ambiguous.
    options: isChoiceKind(question.kind) ? [...new Set(question.options)] : [],
  }))
  .refine((question) => !isChoiceKind(question.kind) || question.options.length >= 2, {
    message: 'Choice questions need at least two different options.',
    path: ['options'],
  })

export type FeedbackQuestionInput = z.infer<typeof feedbackQuestionInputSchema>

export const feedbackQuestionsReplaceSchema = z.strictObject({
  formId: z.uuid(),
  questions: z.array(feedbackQuestionInputSchema).max(FEEDBACK_MAX_QUESTIONS),
})

export const feedbackFormCreateSchema = z.strictObject({
  title: text(1, FEEDBACK_TITLE_MAX),
  useTemplate: z.boolean().optional().default(true),
  makeCurrent: z.boolean().optional().default(true),
})

export const feedbackFormUpdateSchema = z.strictObject({
  formId: z.uuid(),
  title: text(1, FEEDBACK_TITLE_MAX).optional(),
  intro: z.string().transform(normalizeQnaText).pipe(z.string().max(FEEDBACK_INTRO_MAX)).optional(),
  collectContact: z.boolean().optional(),
  acceptingResponses: z.boolean().optional(),
  isCurrent: z.boolean().optional(),
})

export const feedbackFormDeleteSchema = z.strictObject({
  formId: z.uuid(),
})

export const feedbackSubmissionSchema = z.strictObject({
  formId: z.uuid(),
  answers: z.record(z.string(), z.unknown()),
  name: z.string().max(200).optional(),
  email: z.string().max(400).optional(),
})

export interface FeedbackQuestion {
  id: string
  kind: FeedbackKind
  prompt: string
  required: boolean
  options: string[]
}

export type FeedbackAnswer = number | string | string[]
export type FeedbackAnswers = Record<string, FeedbackAnswer>

export interface FeedbackPublicForm {
  id: string
  title: string
  intro: string
  collectContact: boolean
  acceptingResponses: boolean
  questions: FeedbackQuestion[]
}

export interface FeedbackAdminForm {
  id: string
  title: string
  intro: string
  collectContact: boolean
  acceptingResponses: boolean
  isCurrent: boolean
  createdAt: string
  questionCount: number
  responseCount: number
}

export interface FeedbackAdminSnapshot {
  forms: FeedbackAdminForm[]
  currentFormId: string | null
}

export interface FeedbackResponse {
  id: string
  answers: FeedbackAnswers
  name: string | null
  email: string | null
  createdAt: string
}

export interface FeedbackResults {
  form: FeedbackAdminForm
  questions: FeedbackQuestion[]
  responses: FeedbackResponse[]
}

export type FeedbackValidation =
  | { ok: true; answers: FeedbackAnswers; name: string | null; email: string | null }
  | { ok: false; error: string; questionId?: string }

const emailSchema = z.email()

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

/**
 * Check a submission against the form's current questions. Unknown question
 * ids are dropped, so answers always line up with what the host can see.
 */
export function validateFeedbackAnswers(
  questions: FeedbackQuestion[],
  input: { answers: Record<string, unknown>; name?: string; email?: string },
  collectContact: boolean,
): FeedbackValidation {
  const answers: FeedbackAnswers = {}

  for (const question of questions) {
    const raw = input.answers[question.id]
    if (isBlank(raw)) {
      if (question.required) return { ok: false, error: `Please answer: ${question.prompt}`, questionId: question.id }
      continue
    }

    const invalid = { ok: false as const, error: `Please check your answer to: ${question.prompt}`, questionId: question.id }
    switch (question.kind) {
      case 'rating':
        if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 5) return invalid
        answers[question.id] = raw
        break
      case 'single_choice':
        if (typeof raw !== 'string' || !question.options.includes(raw)) return invalid
        answers[question.id] = raw
        break
      case 'multi_choice': {
        if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string' || !question.options.includes(item))) return invalid
        const picked = question.options.filter((option) => raw.includes(option))
        if (picked.length === 0) {
          if (question.required) return { ok: false, error: `Please answer: ${question.prompt}`, questionId: question.id }
          continue
        }
        answers[question.id] = picked
        break
      }
      case 'short_text':
      case 'long_text': {
        if (typeof raw !== 'string') return invalid
        const max = question.kind === 'short_text' ? FEEDBACK_SHORT_TEXT_MAX : FEEDBACK_LONG_TEXT_MAX
        const value = normalizeQnaText(raw)
        if (value.length > max) return { ok: false, error: `Please keep your answer under ${max} characters: ${question.prompt}`, questionId: question.id }
        if (!value) {
          if (question.required) return { ok: false, error: `Please answer: ${question.prompt}`, questionId: question.id }
          continue
        }
        answers[question.id] = value
        break
      }
    }
  }

  if (!collectContact) return { ok: true, answers, name: null, email: null }

  const name = input.name ? normalizeQnaText(input.name).replace(/\s+/g, ' ').slice(0, FEEDBACK_NAME_MAX) : ''
  const email = input.email ? input.email.trim().toLowerCase() : ''
  if (email && !emailSchema.safeParse(email).success) return { ok: false, error: 'Please enter a valid email address, or leave it blank.' }
  return { ok: true, answers, name: name || null, email: email || null }
}

/** Starting questions for a new career-panel form; every one can be edited. */
export const CAREER_PANEL_TEMPLATE: FeedbackQuestionInput[] = [
  { kind: 'rating', prompt: 'Overall, how would you rate the career panel?', required: true, options: [] },
  { kind: 'rating', prompt: 'How helpful was the panel for thinking about your future career?', required: true, options: [] },
  {
    kind: 'single_choice',
    prompt: 'Which best describes you?',
    required: false,
    options: ['Middle school student', 'High school student', 'College student', 'Parent or guardian', 'Teacher or educator', 'Other'],
  },
  {
    kind: 'multi_choice',
    prompt: 'How did you hear about this event?',
    required: false,
    options: ['School', 'Friend or family', 'Social media', 'Pillars of Tech website', 'Other'],
  },
  { kind: 'single_choice', prompt: 'Would you recommend this event to a friend?', required: false, options: ['Yes', 'Maybe', 'No'] },
  { kind: 'long_text', prompt: 'What was the most useful thing you learned?', required: false, options: [] },
  { kind: 'long_text', prompt: 'What careers or topics should we cover next time?', required: false, options: [] },
  { kind: 'long_text', prompt: 'What could we do better?', required: false, options: [] },
]
