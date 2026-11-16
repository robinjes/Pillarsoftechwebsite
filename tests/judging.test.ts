import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { requireVerifiedStaffMock, consumeChatRateLimitMock, supabaseState } = vi.hoisted(() => ({
  requireVerifiedStaffMock: vi.fn(),
  consumeChatRateLimitMock: vi.fn(),
  supabaseState: { judge: null as null | Record<string, unknown>, event: null as null | Record<string, unknown> },
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: requireVerifiedStaffMock }))
vi.mock('@/lib/contact-rate-limit', () => ({ consumeChatRateLimit: consumeChatRateLimitMock }))

// A tiny stand-in for the service-role client: enough for sign-in and the
// "is this judge's event still open?" check the judge routes depend on.
vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceRoleClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {}
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters[column] = value
          return query
        },
        order: () => query,
        returns: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => {
          if (table === 'judging_judges') {
            const judge = supabaseState.judge
            const match = judge && (filters.access_code === judge.access_code || filters.id === judge.id)
            return Promise.resolve({ data: match ? judge : null, error: null })
          }
          if (table === 'judging_events') return Promise.resolve({ data: supabaseState.event, error: null })
          return Promise.resolve({ data: null, error: null })
        },
      }
      return query
    },
  }),
}))

import { POST as signIn } from '@/app/api/judging/session/route'
import { GET as getState } from '@/app/api/judging/state/route'
import { PUT as saveScore } from '@/app/api/judging/scores/route'
import { POST as addJudgeRoute } from '@/app/api/admin/judging/judges/route'
import { PATCH as patchEvent } from '@/app/api/admin/judging/route'
import { metadata as judgingMetadata } from '@/app/judging/page'
import robots from '@/app/robots'
import {
  isScoreComplete,
  normalizeAccessCode,
  parseContestantLines,
  scoreSaveSchema,
  scoreTotal,
  type JudgingEventDetail,
} from '@/lib/judging-contracts'
import { getJudgeIdFromRequest, JUDGE_COOKIE } from '@/lib/judging-server'
import { summarizeJudging } from '@/components/judging/JudgingScoreboard'

const judgeId = '00000000-0000-4000-8000-0000000000d1'
const eventId = '00000000-0000-4000-8000-0000000000e1'
const contestantId = '00000000-0000-4000-8000-0000000000c1'
let previousPepper: string | undefined

beforeAll(() => {
  previousPepper = process.env.CHAT_TOKEN_PEPPER
  process.env.CHAT_TOKEN_PEPPER = 'test-pepper-for-judging'
})
afterAll(() => {
  if (previousPepper === undefined) delete process.env.CHAT_TOKEN_PEPPER
  else process.env.CHAT_TOKEN_PEPPER = previousPepper
})

beforeEach(() => {
  vi.clearAllMocks()
  consumeChatRateLimitMock.mockResolvedValue(true)
  supabaseState.judge = { id: judgeId, event_id: eventId, name: 'Ms. Patel', access_code: 'K7P4QM' }
  supabaseState.event = { id: eventId, title: 'Wildcat Tank', is_current: true, scores_locked: false, current_contestant_id: null, created_at: '2026-11-16T00:00:00Z' }
})

function json(url: string, body: unknown, init: { method?: string; cookie?: string; origin?: string } = {}) {
  return new Request(url, {
    method: init.method ?? 'POST',
    headers: {
      'content-type': 'application/json',
      origin: init.origin ?? 'https://pillarsoftech.org',
      ...(init.cookie ? { cookie: init.cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function signedInCookie(): Promise<string> {
  const response = await signIn(json('https://pillarsoftech.org/api/judging/session', { code: 'k7p4-qm' }))
  const setCookie = response.headers.get('set-cookie') ?? ''
  return setCookie.split(';')[0]
}

describe('judging contracts', () => {
  it('reads judge codes the way people type them', () => {
    expect(normalizeAccessCode(' k7p4-qm ')).toBe('K7P4QM')
  })

  it('parses the bulk student box with optional projects', () => {
    expect(parseContestantLines('Jay - Solar backpack\n\nMaya – Recycling robot\nSam\nAva: Smart cane')).toEqual([
      { name: 'Jay', project: 'Solar backpack' },
      { name: 'Maya', project: 'Recycling robot' },
      { name: 'Sam', project: '' },
      { name: 'Ava', project: 'Smart cane' },
    ])
  })

  it('totals and completes rubrics', () => {
    const partial = { problem: 8, creativity: 9, stem: null, design: 7, pitch: null }
    expect(scoreTotal(partial)).toBe(24)
    expect(isScoreComplete(partial)).toBe(false)
    expect(isScoreComplete({ ...partial, stem: 6, pitch: 10 })).toBe(true)
  })

  it('only accepts whole scores from 1 to 10', () => {
    const base = { contestantId, problem: 5, creativity: 5, stem: 5, design: 5, pitch: 5, comment: '' }
    expect(scoreSaveSchema.safeParse(base).success).toBe(true)
    expect(scoreSaveSchema.safeParse({ ...base, pitch: 11 }).success).toBe(false)
    expect(scoreSaveSchema.safeParse({ ...base, pitch: 0 }).success).toBe(false)
    expect(scoreSaveSchema.safeParse({ ...base, pitch: 7.5 }).success).toBe(false)
    expect(scoreSaveSchema.safeParse({ ...base, pitch: null }).success).toBe(true)
  })
})

describe('judge sign-in', () => {
  it('sets an HttpOnly cookie scoped to the judging API', async () => {
    const response = await signIn(json('https://pillarsoftech.org/api/judging/session', { code: 'K7P4QM' }))
    expect(response.status).toBe(200)
    const setCookie = response.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain(`${JUDGE_COOKIE}=${judgeId}.`)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Path=/api/judging')
  })

  it('rejects wrong codes, closed events, malformed codes, and too many attempts', async () => {
    expect((await signIn(json('https://pillarsoftech.org/api/judging/session', { code: 'ZZZZZZ' }))).status).toBe(401)
    supabaseState.event = { ...supabaseState.event, is_current: false }
    expect((await signIn(json('https://pillarsoftech.org/api/judging/session', { code: 'K7P4QM' }))).status).toBe(401)
    expect((await signIn(json('https://pillarsoftech.org/api/judging/session', { code: '12' }))).status).toBe(400)
    consumeChatRateLimitMock.mockResolvedValueOnce(false)
    expect((await signIn(json('https://pillarsoftech.org/api/judging/session', { code: 'K7P4QM' }))).status).toBe(429)
  })

  it('accepts only an untampered cookie', async () => {
    const cookie = await signedInCookie()
    const request = (value: string) => new Request('https://pillarsoftech.org/api/judging/state', { headers: { cookie: value } })
    expect(getJudgeIdFromRequest(request(cookie))).toBe(judgeId)
    expect(getJudgeIdFromRequest(request(cookie.replace(judgeId, '00000000-0000-4000-8000-0000000000d2')))).toBeNull()
    expect(getJudgeIdFromRequest(request(`${cookie}x`))).toBeNull()
    expect(getJudgeIdFromRequest(request(`${JUDGE_COOKIE}=${judgeId}.forged`))).toBeNull()
  })

  it('signs judges out once their event ends', async () => {
    const cookie = await signedInCookie()
    supabaseState.event = { ...supabaseState.event, is_current: false }
    const response = await getState(new Request('https://pillarsoftech.org/api/judging/state', { headers: { cookie } }))
    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})

describe('saving scores', () => {
  const body = { contestantId, problem: 8, creativity: null, stem: null, design: null, pitch: null, comment: '' }

  it('requires a signed-in judge and the same origin', async () => {
    expect((await saveScore(json('https://pillarsoftech.org/api/judging/scores', body, { method: 'PUT' }))).status).toBe(401)
    const cookie = await signedInCookie()
    expect((await saveScore(json('https://pillarsoftech.org/api/judging/scores', body, { method: 'PUT', cookie, origin: 'https://evil.example' }))).status).toBe(403)
  })

  it('refuses changes once the host locks scores', async () => {
    const cookie = await signedInCookie()
    supabaseState.event = { ...supabaseState.event, scores_locked: true }
    const response = await saveScore(json('https://pillarsoftech.org/api/judging/scores', body, { method: 'PUT', cookie }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ locked: true })
  })
})

describe('host routes', () => {
  it('require staff', async () => {
    requireVerifiedStaffMock.mockResolvedValue({ ok: false, code: 'unauthenticated', status: 401, message: 'Sign in.' })
    expect((await addJudgeRoute(json('https://pillarsoftech.org/api/admin/judging/judges', { eventId, name: 'Mr. Lee' }))).status).toBe(401)
    expect((await patchEvent(json('https://pillarsoftech.org/api/admin/judging', { eventId, currentContestantId: contestantId }, { method: 'PATCH' }))).status).toBe(401)
  })
})

describe('scoreboard', () => {
  it('ranks by the average of complete rubrics and ignores partial ones', () => {
    const score = (judge: string, contestant: string, values: number[] | null) => ({
      judgeId: judge,
      contestantId: contestant,
      problem: values?.[0] ?? null,
      creativity: values?.[1] ?? null,
      stem: values?.[2] ?? null,
      design: values?.[3] ?? null,
      pitch: values?.[4] ?? null,
      comment: '',
      updatedAt: '2026-11-16T00:00:00Z',
    })
    const detail = {
      event: {} as JudgingEventDetail['event'],
      judges: [],
      contestants: [{ id: 'jay', name: 'Jay', project: '' }, { id: 'maya', name: 'Maya', project: '' }, { id: 'sam', name: 'Sam', project: '' }],
      scores: [
        score('a', 'jay', [8, 8, 8, 8, 8]), // 40
        score('b', 'jay', [6, 6, 6, 6, 6]), // 30 -> avg 35
        score('a', 'maya', [9, 9, 9, 9, 9]), // 45
        { ...score('b', 'maya', [1, 1, 1, 1, 1]), pitch: null }, // partial, ignored
      ],
    } as JudgingEventDetail
    const ranked = summarizeJudging(detail)
    expect(ranked.map((row) => [row.contestant.name, row.average])).toEqual([['Maya', 45], ['Jay', 35], ['Sam', null]])
    expect(ranked[0].scores).toHaveLength(2)
    expect(ranked[0].complete).toHaveLength(1)
  })
})

describe('the /judging page stays unlisted', () => {
  it('asks search engines not to index it and is not advertised', () => {
    expect(judgingMetadata.robots).toMatchObject({ index: false, follow: false })
    expect(JSON.stringify(robots())).not.toContain('judging')
    expect(readFileSync(path.join(process.cwd(), 'src/app/sitemap.ts'), 'utf8')).not.toContain('/judging')
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
    const allowed = [path.join('src', 'components', 'judging'), path.join('src', 'components', 'admin'), path.join('src', 'app', '(admin-protected)')]
    const offenders = files
      .filter((file) => !allowed.some((prefix) => path.relative(process.cwd(), file).startsWith(prefix)))
      .filter((file) => /(href|src|url)\s*[=:]\s*\{?\s*["'`][^"'`]*\/judging\b/i.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})

describe('access code alphabet', () => {
  it('has no look-alike characters and matches the database check', async () => {
    const { ACCESS_CODE_ALPHABET } = await import('@/lib/judging-contracts')
    expect(ACCESS_CODE_ALPHABET).toBe(['ABCDEFGH', 'JK', 'MN', 'PQRSTUVWXYZ', '23456789'].join(''))
    expect(ACCESS_CODE_ALPHABET).not.toMatch(/[01ILO]/)
    expect(/^[A-HJ-NP-Z2-9]+$/.test(ACCESS_CODE_ALPHABET)).toBe(true)
  })
})
