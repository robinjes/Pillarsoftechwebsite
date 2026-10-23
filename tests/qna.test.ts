import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  allowQnaActionMock,
  submitQnaQuestionMock,
  setQnaUpvoteMock,
  getPublicQnaSnapshotMock,
  requireVerifiedStaffMock,
  updateQnaQuestionStatusMock,
} = vi.hoisted(() => ({
  allowQnaActionMock: vi.fn(),
  submitQnaQuestionMock: vi.fn(),
  setQnaUpvoteMock: vi.fn(),
  getPublicQnaSnapshotMock: vi.fn(),
  requireVerifiedStaffMock: vi.fn(),
  updateQnaQuestionStatusMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: requireVerifiedStaffMock }))
vi.mock('@/lib/qna-server', async () => {
  class QnaNotFoundError extends Error {}
  return {
    QnaNotFoundError,
    allowQnaAction: allowQnaActionMock,
    submitQnaQuestion: submitQnaQuestionMock,
    setQnaUpvote: setQnaUpvoteMock,
    getPublicQnaSnapshot: getPublicQnaSnapshotMock,
    updateQnaQuestionStatus: updateQnaQuestionStatusMock,
    getQnaVisitorToken: (request: Request) => {
      const value = request.headers.get('x-qna-visitor')
      return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null
    },
  }
})

import { GET as getSnapshot } from '@/app/api/qna/route'
import { POST as postQuestion } from '@/app/api/qna/questions/route'
import { POST as postUpvote } from '@/app/api/qna/questions/[id]/upvote/route'
import { PATCH as patchAdminQuestion } from '@/app/api/admin/qna/questions/route'
import { metadata as qnaMetadata } from '@/app/qna/page'
import robots from '@/app/robots'
import { qnaQuestionSubmissionSchema, sortQnaQuestions } from '@/lib/qna-contracts'

const visitor = 'a'.repeat(43)
const questionId = '00000000-0000-4000-8000-0000000000b1'

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://pillarsoftech.org', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  allowQnaActionMock.mockResolvedValue(true)
})

describe('Q&A contracts', () => {
  it('normalizes questions and treats a blank name as anonymous', () => {
    const parsed = qnaQuestionSubmissionSchema.parse({ body: '  What   was your first job?\u0007 ', authorName: '   ' })
    expect(parsed).toEqual({ body: 'What was your first job?', authorName: null })
  })

  it('rejects questions that are too short, too long, or carry unknown fields', () => {
    expect(qnaQuestionSubmissionSchema.safeParse({ body: 'hi' }).success).toBe(false)
    expect(qnaQuestionSubmissionSchema.safeParse({ body: 'x'.repeat(301) }).success).toBe(false)
    expect(qnaQuestionSubmissionSchema.safeParse({ body: 'A real question', status: 'answered' }).success).toBe(false)
  })

  it('sorts popular by votes then recency, and recent by time', () => {
    const items = [
      { id: 'a', upvotes: 1, createdAt: '2026-10-23T10:00:00Z' },
      { id: 'b', upvotes: 5, createdAt: '2026-10-23T09:00:00Z' },
      { id: 'c', upvotes: 1, createdAt: '2026-10-23T11:00:00Z' },
    ]
    expect(sortQnaQuestions(items, 'popular').map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(sortQnaQuestions(items, 'recent').map((item) => item.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('public Q&A routes', () => {
  it('serves the snapshot with a short shared cache and noindex', async () => {
    getPublicQnaSnapshotMock.mockResolvedValue({ session: null, questions: [] })
    const response = await getSnapshot()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('s-maxage=2')
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
  })

  it('does not cache failures', async () => {
    getPublicQnaSnapshotMock.mockRejectedValue(new Error('db down'))
    const response = await getSnapshot()
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('requires a device token to post a question', async () => {
    const response = await postQuestion(jsonRequest('https://pillarsoftech.org/api/qna/questions', { body: 'How did you start?' }))
    expect(response.status).toBe(400)
    expect(submitQnaQuestionMock).not.toHaveBeenCalled()
  })

  it('rejects cross-origin posts', async () => {
    const response = await postQuestion(
      jsonRequest('https://pillarsoftech.org/api/qna/questions', { body: 'How did you start?' }, { origin: 'https://evil.example', 'x-qna-visitor': visitor }),
    )
    expect(response.status).toBe(403)
  })

  it('rate limits before writing', async () => {
    allowQnaActionMock.mockResolvedValue(false)
    const response = await postQuestion(
      jsonRequest('https://pillarsoftech.org/api/qna/questions', { body: 'How did you start?' }, { 'x-qna-visitor': visitor }),
    )
    expect(response.status).toBe(429)
    expect(submitQnaQuestionMock).not.toHaveBeenCalled()
  })

  it('posts a valid question and reports a closed session', async () => {
    submitQnaQuestionMock.mockResolvedValueOnce({ id: questionId, body: 'How did you start?', authorName: 'Sam', upvotes: 0, answered: false, createdAt: 'now' })
    const created = await postQuestion(
      jsonRequest('https://pillarsoftech.org/api/qna/questions', { body: 'How did you start?', authorName: 'Sam' }, { 'x-qna-visitor': visitor }),
    )
    expect(created.status).toBe(201)
    expect(submitQnaQuestionMock).toHaveBeenCalledWith({ body: 'How did you start?', authorName: 'Sam', visitorToken: visitor })

    submitQnaQuestionMock.mockResolvedValueOnce('closed')
    const closed = await postQuestion(
      jsonRequest('https://pillarsoftech.org/api/qna/questions', { body: 'How did you start?' }, { 'x-qna-visitor': visitor }),
    )
    expect(closed.status).toBe(409)
  })

  it('sets upvotes and maps unavailable questions to 404', async () => {
    setQnaUpvoteMock.mockResolvedValueOnce(3)
    const params = Promise.resolve({ id: questionId })
    const ok = await postUpvote(jsonRequest(`https://pillarsoftech.org/api/qna/questions/${questionId}/upvote`, { upvoted: true }, { 'x-qna-visitor': visitor }), { params })
    expect(await ok.json()).toEqual({ upvotes: 3 })
    expect(setQnaUpvoteMock).toHaveBeenCalledWith(questionId, visitor, true)

    const { QnaNotFoundError } = await import('@/lib/qna-server')
    setQnaUpvoteMock.mockRejectedValueOnce(new QnaNotFoundError())
    const gone = await postUpvote(jsonRequest(`https://pillarsoftech.org/api/qna/questions/${questionId}/upvote`, { upvoted: true }, { 'x-qna-visitor': visitor }), { params })
    expect(gone.status).toBe(404)

    const bad = await postUpvote(jsonRequest('https://pillarsoftech.org/api/qna/questions/nope/upvote', { upvoted: true }, { 'x-qna-visitor': visitor }), { params: Promise.resolve({ id: 'nope' }) })
    expect(bad.status).toBe(404)
  })
})

describe('Q&A host routes', () => {
  it('require staff before any change', async () => {
    requireVerifiedStaffMock.mockResolvedValue({ ok: false, code: 'unauthenticated', status: 401, message: 'A verified sign-in is required.' })
    const request = new Request('https://pillarsoftech.org/api/admin/qna/questions', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId, status: 'hidden' }),
    })
    const response = await patchAdminQuestion(request)
    expect(response.status).toBe(401)
    expect(updateQnaQuestionStatusMock).not.toHaveBeenCalled()
  })
})

describe('the /qna page stays unlisted', () => {
  it('asks search engines not to index it', () => {
    expect(qnaMetadata.robots).toMatchObject({ index: false, follow: false })
  })

  it('is not advertised in robots.txt or the sitemap', () => {
    expect(JSON.stringify(robots())).not.toContain('qna')
    const sitemap = readFileSync(path.join(process.cwd(), 'src/app/sitemap.ts'), 'utf8')
    expect(sitemap).not.toContain('qna')
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

    // Only the host tools (behind staff sign-in) may build or show the link.
    const allowed = [path.join('src', 'components', 'qna'), path.join('src', 'app', '(admin-protected)')]
    const offenders = files
      .filter((file) => !allowed.some((prefix) => path.relative(process.cwd(), file).startsWith(prefix)))
      .filter((file) => /(href|src|url)\s*[=:]\s*\{?\s*["'`][^"'`]*\/qna\b/i.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
