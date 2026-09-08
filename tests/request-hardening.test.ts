import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  createServerClientMock,
  requireVerifiedStaffMock,
  parseMediaSignRequestMock,
  signMediaUploadMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  requireVerifiedStaffMock: vi.fn(),
  parseMediaSignRequestMock: vi.fn(),
  signMediaUploadMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@supabase/ssr', () => ({ createServerClient: createServerClientMock }))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: requireVerifiedStaffMock }))
vi.mock('@/lib/media/server', () => ({
  MediaPipelineError: class MockMediaPipelineError extends Error {
    status = 503
    code = 'media_pipeline_error'
  },
  parseMediaSignRequest: parseMediaSignRequestMock,
  signMediaUpload: signMediaUploadMock,
}))

import { POST as signMedia } from '@/app/api/admin/media/sign/route'
import { middleware } from '@/middleware'
import { sameOrigin } from '@/lib/volunteer-api'

const staff = { ok: true as const, isStaff: true as const, user: { id: 'staff-1' } }

const mutationCoverage = [
  { file: 'src/app/api/admin/events/route.ts', methods: ['POST', 'PUT', 'PATCH', 'DELETE'] },
  { file: 'src/app/api/admin/forms/route.ts', methods: ['POST', 'PATCH', 'DELETE'] },
  { file: 'src/app/api/admin/content/route.ts', methods: ['POST', 'PUT'] },
  { file: 'src/app/api/admin/impact/route.ts', methods: ['POST', 'PUT', 'DELETE'] },
  { file: 'src/app/api/admin/media/sign/route.ts', methods: ['POST'] },
  { file: 'src/app/api/admin/media/finalize/route.ts', methods: ['POST'] },
] as const

function functionBlock(source: string, method: string): string {
  const start = source.indexOf(`export async function ${method}(request: Request)`)
  if (start < 0) return ''
  const next = source.indexOf('\nexport async function ', start + 1)
  return source.slice(start, next < 0 ? source.length : next)
}

describe('state-changing admin request hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireVerifiedStaffMock.mockResolvedValue(staff)
  })

  it('guards every protected admin mutation before body parsing or storage', () => {
    for (const route of mutationCoverage) {
      const source = readFileSync(path.resolve(process.cwd(), route.file), 'utf8')
      expect(source).toContain('sameOriginFailure')
      for (const method of route.methods) {
        const block = functionBlock(source, method)
        expect(block, `${route.file} ${method} handler exists`).not.toBe('')
        const authPosition = block.indexOf('await requireVerifiedStaff()')
        const originPosition = block.indexOf('sameOrigin(request)')
        expect(originPosition, `${route.file} ${method} checks Origin`).toBeGreaterThan(authPosition)
        const bodyPosition = block.indexOf('readJson(request)')
        if (bodyPosition >= 0) {
          expect(originPosition, `${route.file} ${method} checks Origin before parsing`).toBeLessThan(bodyPosition)
        }
      }
    }
  })

  it('rejects an explicit cross-origin media sign before parsing or signing', async () => {
    const request = new Request('https://pillarsoftech.org/api/admin/media/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: 'not-json',
    })

    const response = await signMedia(request)

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ error: 'same_origin_required' })
    expect(parseMediaSignRequestMock).not.toHaveBeenCalled()
    expect(signMediaUploadMock).not.toHaveBeenCalled()
  })

  it('uses the configured canonical origin across a proxy hostname mismatch', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://127.0.0.1:4173')
    expect(sameOrigin(new Request('http://localhost:4173/api/admin/events', {
      method: 'POST',
      headers: { Origin: 'http://127.0.0.1:4173' },
    }))).toBe(true)
    expect(sameOrigin(new Request('http://localhost:4173/api/admin/events', {
      method: 'POST',
      headers: { Origin: 'http://evil.example:4173' },
    }))).toBe(false)
    vi.unstubAllEnvs()
  })

  it('fails closed for malformed, opaque, and path-bearing Origin values', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://pillarsoftech.org')
    for (const origin of ['null', '', 'not-an-origin', 'https://pillarsoftech.org/path', 'https://pillarsoftech.org?query=1']) {
      expect(sameOrigin(new Request('http://localhost:4173/api/admin/events', {
        method: 'POST',
        headers: { Origin: origin },
      })), origin || 'empty Origin').toBe(false)
    }
    vi.unstubAllEnvs()
  })

  it('allows missing Origin and falls back to request.url when canonical config is absent', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(sameOrigin(new Request('https://pillarsoftech.org/api/admin/events', { method: 'POST' }))).toBe(true)
    expect(sameOrigin(new Request('https://pillarsoftech.org/api/admin/events', {
      method: 'POST',
      headers: { Origin: 'https://pillarsoftech.org' },
    }))).toBe(true)
    expect(sameOrigin(new Request('https://pillarsoftech.org/api/admin/events', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    }))).toBe(false)
    vi.unstubAllEnvs()
  })
})

describe('middleware session refresh resilience', () => {
  it('does not advertise the framework in response headers', () => {
    const config = readFileSync(path.resolve(process.cwd(), 'next.config.js'), 'utf8')
    expect(config).toContain('poweredByHeader: false')
  })

  it('keeps public documents available with security headers when refresh fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key')
    const getUser = vi.fn().mockRejectedValue(new Error('refresh provider unavailable'))
    createServerClientMock.mockReturnValue({ auth: { getUser } })

    try {
      const response = await middleware(new NextRequest('https://pillarsoftech.org/events', {
        headers: { accept: 'text/html' },
      }))

      expect(response.status).toBe(200)
      expect(getUser).toHaveBeenCalledOnce()
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      expect(response.headers.get('content-security-policy')).toContain('nonce-')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
