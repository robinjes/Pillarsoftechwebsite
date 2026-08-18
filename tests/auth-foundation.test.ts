import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { getSafeNextPath, isSafeNextPath } from '@/lib/auth/redirect'
import { GET as handleAuthCallback } from '@/app/auth/callback/route'
import { POST as handleSignout } from '@/app/auth/signout/route'
import {
  getVerifiedAuthContext,
  requireVerifiedStaff,
  requireVerifiedUser,
} from '@/lib/auth/server'
import { getSupabasePublicConfig } from '@/lib/supabase/config'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const mockedCreateServerClient = vi.mocked(createSupabaseServerClient)

function fakeClient({
  user,
  staff,
  staffError,
}: {
  user: { id: string; email?: string } | null
  staff?: { user_id: string } | null
  staffError?: Error | null
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : new Error('invalid') }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: staff, error: staffError || null }),
        })),
      })),
    })),
  }
}

describe('verified server authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCreateServerClient.mockResolvedValue(
      fakeClient({ user: { id: 'user-1', email: 'volunteer@example.test' }, staff: null }) as never
    )
  })

  it('does not let a forged legacy admin cookie authorize a user', async () => {
    const result = await requireVerifiedStaff()
    expect(result).toMatchObject({ ok: false, code: 'not_staff', status: 403 })
    expect(mockedCreateServerClient).toHaveBeenCalled()
  })

  it('maps an absent or invalid session to 401', async () => {
    mockedCreateServerClient.mockResolvedValue(fakeClient({ user: null }) as never)
    await expect(requireVerifiedUser()).resolves.toMatchObject({
      ok: false,
      code: 'unauthenticated',
      status: 401,
    })
  })

  it('maps a verified non-staff user to 403', async () => {
    await expect(requireVerifiedStaff()).resolves.toMatchObject({
      ok: false,
      code: 'not_staff',
      status: 403,
    })
  })

  it('allows a verified staff membership', async () => {
    mockedCreateServerClient.mockResolvedValue(
      fakeClient({ user: { id: 'staff-1', email: 'owner@example.test' }, staff: { user_id: 'staff-1' } }) as never
    )
    await expect(requireVerifiedStaff()).resolves.toMatchObject({
      ok: true,
      isStaff: true,
      user: { id: 'staff-1' },
    })
  })

  it('does not promote an email containing staff', async () => {
    mockedCreateServerClient.mockResolvedValue(
      fakeClient({ user: { id: 'user-2', email: 'staff-helper@example.test' }, staff: null }) as never
    )
    await expect(getVerifiedAuthContext()).resolves.toMatchObject({
      ok: true,
      isStaff: false,
      user: { email: 'staff-helper@example.test' },
    })
  })

  it('fails closed with 503 when server configuration is missing', async () => {
    mockedCreateServerClient.mockResolvedValue(null)
    await expect(requireVerifiedStaff()).resolves.toMatchObject({
      ok: false,
      code: 'configuration_unavailable',
      status: 503,
    })
  })
})

describe('OAuth callback destination validation', () => {
  it('accepts only same-origin root-relative paths', () => {
    expect(isSafeNextPath('/admin')).toBe(true)
    expect(isSafeNextPath('/volunteer?next=%2Fadmin')).toBe(true)
    expect(isSafeNextPath('https://evil.example/steal')).toBe(false)
    expect(isSafeNextPath('//evil.example/steal')).toBe(false)
    expect(isSafeNextPath('\\\\evil.example\\steal')).toBe(false)
    expect(isSafeNextPath('/\n/evil.example')).toBe(false)
    expect(isSafeNextPath('/\r/evil.example')).toBe(false)
    expect(isSafeNextPath('/\t/evil.example')).toBe(false)
    expect(isSafeNextPath('/admin%0A')).toBe(true)
    expect(getSafeNextPath('https://evil.example/steal')).toBe('/admin')
  })

  it('uses the configured canonical origin instead of a request Host value', async () => {
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pillarsoftech.org'
    mockedCreateServerClient.mockResolvedValue({
      auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
    } as never)

    const response = await handleAuthCallback(
      new Request('https://attacker.example/auth/callback?code=test&next=%2Fadmin')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://pillarsoftech.org/admin')
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl
  })

  it('fails closed for a non-local callback without a canonical origin', async () => {
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_SITE_URL

    const response = await handleAuthCallback(
      new Request('https://attacker.example/auth/callback?code=test&next=%2Fadmin')
    )

    expect(response.status).toBe(503)
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl
  })
})

describe('signout origin validation', () => {
  it('rejects a cross-origin request before mutating the Supabase session', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    mockedCreateServerClient.mockResolvedValue({ auth: { signOut } } as never)

    const response = await handleSignout(new Request('https://pillarsoftech.org/auth/signout', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    }))

    expect(response.status).toBe(403)
    expect(signOut).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'same_origin_required',
      message: 'This request must come from the site.',
    })
  })

  it('keeps no-origin server/tool compatibility while signing out', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    mockedCreateServerClient.mockResolvedValue({ auth: { signOut } } as never)

    const response = await handleSignout(new Request('https://pillarsoftech.org/auth/signout', { method: 'POST' }))

    expect(response.status).toBe(200)
    expect(signOut).toHaveBeenCalledOnce()
  })
})

describe('legacy auth static guard', () => {
  it('contains no forgeable cookie, hardcoded credential, or client role mutator', () => {
    const sourceRoot = path.resolve(process.cwd(), 'src')
    const sourceFiles: string[] = []
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name)
        if (entry.isDirectory()) walk(entryPath)
        else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(entryPath)
      }
    }
    walk(sourceRoot)
    const source = sourceFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
    expect(source).not.toMatch(/admin_session|ADMIN_PASSWORD|PillarsAdmin|admin_access_time/)
    expect(source).not.toMatch(/email\s*\.\s*includes\s*\(\s*['"]staff/i)
    expect(source).not.toMatch(/updateUserRole|signInWithPassword|resetPasswordForEmail/)
  })
})

describe('missing browser configuration', () => {
  it('does not manufacture a Supabase configuration', () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    expect(getSupabasePublicConfig()).toBeNull()
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey
  })

  it('allows HTTPS or explicit local HTTP only', () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'ftp://localhost/project'
    expect(getSupabasePublicConfig()).toBeNull()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    expect(getSupabasePublicConfig()).not.toBeNull()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    expect(getSupabasePublicConfig()).not.toBeNull()

    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey
  })
})
