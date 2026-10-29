import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  allowFeedbackSubmissionMock,
  submitFeedbackMock,
  getPublicFeedbackFormMock,
  requireVerifiedStaffMock,
  replaceFeedbackQuestionsMock,
  deleteFeedbackFormMock,
} = vi.hoisted(() => ({
  allowFeedbackSubmissionMock: vi.fn(),
  submitFeedbackMock: vi.fn(),
  getPublicFeedbackFormMock: vi.fn(),
  requireVerifiedStaffMock: vi.fn(),
  replaceFeedbackQuestionsMock: vi.fn(),
  deleteFeedbackFormMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: requireVerifiedStaffMock }))
vi.mock('@/lib/qna-server', () => ({
  getQnaVisitorToken: (request: Request) => {
    const value = request.headers.get('x-qna-visitor')
    return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null
  },
}))
vi.mock('@/lib/feedback-server', () => {
  class FeedbackNotFoundError extends Error {}
  class FeedbackConflictError extends Error {}
  return {
    FeedbackNotFoundError,
    FeedbackConflictError,
    allowFeedbackSubmission: allowFeedbackSubmissionMock,
    submitFeedback: submitFeedbackMock,
    getPublicFeedbackForm: getPublicFeedbackFormMock,
    replaceFeedbackQuestions: replaceFeedbackQuestionsMock,
    deleteFeedbackForm: deleteFeedbackFormMock,
    createFeedbackForm: vi.fn(),
    updateFeedbackForm: vi.fn(),
    getAdminFeedbackSnapshot: vi.fn(),
  }
})

import { GET as getForm } from '@/app/api/feedback/route'
import { POST as postResponse } from '@/app/api/feedback/responses/route'
import { DELETE as deleteForm } from '@/app/api/admin/feedback/route'
import { PUT as putQuestions } from '@/app/api/admin/feedback/questions/route'
import { metadata as feedbackMetadata } from '@/app/feedback/page'
import robots from '@/app/robots'
import {
  CAREER_PANEL_TEMPLATE,
  feedbackQuestionInputSchema,
  validateFeedbackAnswers,
  type FeedbackQuestion,
} from '@/lib/feedback-contracts'

const visitor = 'b'.repeat(43)
const formId = '00000000-0000-4000-8000-0000000000f1'
const staff = { ok: true as const, isStaff: true as const, user: { id: 'staff-1' } }

const questions: FeedbackQuestion[] = [
  { id: 'rating', kind: 'rating', prompt: 'Overall?', required: true, options: [] },
  { id: 'grade', kind: 'single_choice', prompt: 'Grade?', required: false, options: ['9', '10'] },
  { id: 'heard', kind: 'multi_choice', prompt: 'Heard from?', required: false, options: ['School', 'Friend', 'Web'] },
  { id: 'short', kind: 'short_text', prompt: 'School?', required: false, options: [] },
  { id: 'long', kind: 'long_text', prompt: 'Thoughts?', required: false, options: [] },
]

function post(url: string, body: unknown, headers: Record<string, string> = {}, method = 'POST') {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json', origin: 'https://pillarsoftech.org', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  allowFeedbackSubmissionMock.mockResolvedValue(true)
  requireVerifiedStaffMock.mockResolvedValue(staff)
})

describe('feedback answer validation', () => {
  it('accepts a complete answer set and normalizes it', () => {
    const result = validateFeedbackAnswers(
      questions,
      { answers: { rating: 5, grade: '10', heard: ['Web', 'School'], short: '  Lincoln   High ', long: 'Great!', stray: 'ignored' }, name: ' Ana ', email: 'ANA@Example.com' },
      true,
    )
    expect(result).toEqual({
      ok: true,
      // Checkbox answers follow the option order; unknown question ids are dropped.
      answers: { rating: 5, grade: '10', heard: ['School', 'Web'], short: 'Lincoln High', long: 'Great!' },
      name: 'Ana',
      email: 'ana@example.com',
    })
  })

  it('requires required questions and rejects out-of-range or unknown values', () => {
    expect(validateFeedbackAnswers(questions, { answers: {} }, false)).toMatchObject({ ok: false, questionId: 'rating' })
    expect(validateFeedbackAnswers(questions, { answers: { rating: 6 } }, false)).toMatchObject({ ok: false, questionId: 'rating' })
    expect(validateFeedbackAnswers(questions, { answers: { rating: 2.5 } }, false)).toMatchObject({ ok: false })
    expect(validateFeedbackAnswers(questions, { answers: { rating: 3, grade: '12' } }, false)).toMatchObject({ ok: false, questionId: 'grade' })
    expect(validateFeedbackAnswers(questions, { answers: { rating: 3, heard: ['Hacker'] } }, false)).toMatchObject({ ok: false, questionId: 'heard' })
    expect(validateFeedbackAnswers(questions, { answers: { rating: 3, short: 'x'.repeat(201) } }, false)).toMatchObject({ ok: false, questionId: 'short' })
  })

  it('drops contact details when the form does not ask for them, and checks emails when it does', () => {
    expect(validateFeedbackAnswers(questions, { answers: { rating: 4 }, name: 'Ana', email: 'ana@example.com' }, false)).toMatchObject({ ok: true, name: null, email: null })
    expect(validateFeedbackAnswers(questions, { answers: { rating: 4 }, email: 'not-an-email' }, true)).toMatchObject({ ok: false })
  })

  it('requires two distinct options for choice questions and strips options from others', () => {
    expect(feedbackQuestionInputSchema.safeParse({ kind: 'single_choice', prompt: 'Pick', options: ['A', 'A'] }).success).toBe(false)
    expect(feedbackQuestionInputSchema.parse({ kind: 'long_text', prompt: 'Why?', options: ['A', 'B'] }).options).toEqual([])
  })

  it('ships a valid career panel template', () => {
    for (const question of CAREER_PANEL_TEMPLATE) expect(feedbackQuestionInputSchema.safeParse(question).success).toBe(true)
  })
})

describe('public feedback routes', () => {
  it('serves the live form with a short shared cache and noindex', async () => {
    getPublicFeedbackFormMock.mockResolvedValue(null)
    const response = await getForm()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ form: null })
    expect(response.headers.get('cache-control')).toContain('s-maxage=5')
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
  })

  it('requires a device token and the same origin', async () => {
    expect((await postResponse(post('https://pillarsoftech.org/api/feedback/responses', { formId, answers: {} }))).status).toBe(400)
    expect((await postResponse(post('https://pillarsoftech.org/api/feedback/responses', { formId, answers: {} }, { origin: 'https://evil.example', 'x-qna-visitor': visitor }))).status).toBe(403)
    expect(submitFeedbackMock).not.toHaveBeenCalled()
  })

  it('maps every submission outcome to a clear response', async () => {
    const send = () => postResponse(post('https://pillarsoftech.org/api/feedback/responses', { formId, answers: { rating: 5 } }, { 'x-qna-visitor': visitor }))

    submitFeedbackMock.mockResolvedValueOnce('ok')
    expect((await send()).status).toBe(201)
    expect(submitFeedbackMock).toHaveBeenCalledWith({ formId, answers: { rating: 5 }, visitorToken: visitor })

    submitFeedbackMock.mockResolvedValueOnce('duplicate')
    const duplicate = await send()
    expect(duplicate.status).toBe(409)
    expect(await duplicate.json()).toMatchObject({ duplicate: true })

    submitFeedbackMock.mockResolvedValueOnce('closed')
    expect((await send()).status).toBe(409)

    submitFeedbackMock.mockResolvedValueOnce({ error: 'Please answer: Overall?', questionId: 'rating' })
    const invalid = await send()
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toEqual({ error: 'Please answer: Overall?', questionId: 'rating' })

    allowFeedbackSubmissionMock.mockResolvedValueOnce(false)
    expect((await send()).status).toBe(429)
  })
})

describe('feedback host routes', () => {
  it('require staff before saving questions', async () => {
    requireVerifiedStaffMock.mockResolvedValue({ ok: false, code: 'unauthenticated', status: 401, message: 'Sign in.' })
    const response = await putQuestions(post('https://pillarsoftech.org/api/admin/feedback/questions', { formId, questions: [] }, {}, 'PUT'))
    expect(response.status).toBe(401)
    expect(replaceFeedbackQuestionsMock).not.toHaveBeenCalled()
  })

  it('explains choice questions without enough options', async () => {
    const response = await putQuestions(post('https://pillarsoftech.org/api/admin/feedback/questions', {
      formId,
      questions: [{ kind: 'single_choice', prompt: 'Pick one', required: false, options: ['Only'] }],
    }, {}, 'PUT'))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('at least two different options')
  })

  it('refuses to delete the live form', async () => {
    const { FeedbackConflictError } = await import('@/lib/feedback-server')
    deleteFeedbackFormMock.mockRejectedValueOnce(new FeedbackConflictError('End the form before deleting it.'))
    const response = await deleteForm(post('https://pillarsoftech.org/api/admin/feedback', { formId }, {}, 'DELETE'))
    expect(response.status).toBe(409)
  })
})

describe('the /feedback page stays unlisted', () => {
  it('asks search engines not to index it', () => {
    expect(feedbackMetadata.robots).toMatchObject({ index: false, follow: false })
  })

  it('is not advertised in robots.txt or the sitemap', () => {
    expect(JSON.stringify(robots())).not.toContain('feedback')
    expect(readFileSync(path.join(process.cwd(), 'src/app/sitemap.ts'), 'utf8')).not.toContain('/feedback')
  })

  it('has no public link pointing at it', () => {
    const files: string[] = []
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name)
        if (entry.isDirectory()) walk(fullPath)
        else if (/\.(ts|tsx|js|json|md)$/.test(entry.name)) files.push(fullPath)
      }
    }
    walk(path.join(process.cwd(), 'src'))
    walk(path.join(process.cwd(), 'public'))

    // Only the staff-only host tools may build or show the link.
    const allowed = [path.join('src', 'components', 'feedback'), path.join('src', 'components', 'admin'), path.join('src', 'app', '(admin-protected)')]
    const offenders = files
      .filter((file) => !allowed.some((prefix) => path.relative(process.cwd(), file).startsWith(prefix)))
      .filter((file) => /(href|src|url)\s*[=:]\s*\{?\s*["'`][^"'`]*\/feedback\b/i.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
