import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/service', () => ({ createSupabaseServiceRoleClient: vi.fn() }))

import { applySecurityHeaders, buildContentSecurityPolicy, middleware } from '@/middleware'
import {
  detectMediaType,
  detectedMatchesClaimed,
  normalizeDisplayName,
  objectKeyFor,
  MEDIA_POLICIES,
} from '@/lib/media/policy'
import { parseMediaSignRequest, sanitizeImageBuffer } from '@/lib/media/server'

describe('media policy', () => {
  it('generates random server-owned keys and never uses traversal names', () => {
    const key = objectKeyFor(MEDIA_POLICIES['image/jpeg'], 'incoming')
    expect(key).toMatch(/^incoming\/[a-f0-9]{48}\.jpg$/)
    expect(key).not.toContain('evil')
    expect(normalizeDisplayName('../../evil.jpg')).toBe('evil.jpg')
  })

  it('detects supported magic bytes and rejects claimed spoofing', () => {
    expect(detectMediaType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))?.contentType).toBe('image/jpeg')
    expect(detectMediaType(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))?.contentType).toBe('application/pdf')
    expect(detectMediaType(Uint8Array.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]))?.contentType).toBe('video/mp4')
    expect(detectedMatchesClaimed(MEDIA_POLICIES['application/pdf'], detectMediaType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))!)).toBe(false)
    expect(() => parseMediaSignRequest({ filename: 'x.pdf', contentType: 'application/pdf', size: 20, visibility: 'public' })).toThrow()
  })

  it('rejects unsupported and oversized sign claims', () => {
    expect(() => parseMediaSignRequest({ filename: 'x.exe', contentType: 'application/octet-stream', size: 10 })).toThrow()
    expect(() => parseMediaSignRequest({ filename: 'x.jpg', contentType: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toThrow()
  })

  it('re-encodes images to WebP without carrying metadata', async () => {
    const input = await sharp({
      create: { width: 2, height: 2, channels: 3, background: { r: 20, g: 40, b: 80 } },
    }).withMetadata({ exif: { IFD0: { Artist: 'private test value' } } }).jpeg().toBuffer()
    const output = await sanitizeImageBuffer(input)
    const metadata = await sharp(output).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.exif).toBeUndefined()
  })
})

describe('media security boundaries', () => {
  it('applies defense-in-depth headers and fresh document nonces, but not API nonces', async () => {
    const first = await middleware(new NextRequest('https://pillarsoftech.org/admin', { headers: { accept: 'text/html' } }))
    const second = await middleware(new NextRequest('https://pillarsoftech.org/admin', { headers: { accept: 'text/html' } }))
    const firstCsp = first.headers.get('content-security-policy') || ''
    const secondCsp = second.headers.get('content-security-policy') || ''
    expect(firstCsp).toMatch(/nonce-[A-Za-z0-9+/=]+/)
    expect(firstCsp).not.toBe(secondCsp)
    expect(first.headers.get('x-content-type-options')).toBe('nosniff')
    expect(first.headers.get('x-frame-options')).toBe('DENY')
    expect(first.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(first.headers.get('permissions-policy')).toContain('camera=(self)')
    const api = await middleware(new NextRequest('https://pillarsoftech.org/api/events', { headers: { accept: 'application/json' } }))
    expect(api.headers.get('content-security-policy')).toBeNull()

    vi.stubEnv('NODE_ENV', 'production')
    try {
      const production = applySecurityHeaders(new NextResponse(null), buildContentSecurityPolicy('production-nonce', true))
      expect(production.headers.get('strict-transport-security')).toContain('max-age=31536000')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('uses nonce CSP and excludes legacy external media origins', () => {
    const csp = buildContentSecurityPolicy('test-nonce', true)
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'")
    expect(csp).toContain("style-src 'self' 'nonce-test-nonce'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('frame-ancestors \'none\'')
    expect(csp).toContain('upgrade-insecure-requests')
    expect(csp).toContain('https://hcb.hackclub.com')
    expect(csp).not.toContain('api.qrserver.com')
    expect(csp).not.toContain('images.unsplash.com')
    expect(csp).not.toContain('ui-avatars.com')
    expect(csp).not.toContain('res.cloudinary.com')
    expect(buildContentSecurityPolicy('test-nonce', true, false)).not.toContain('upgrade-insecure-requests')
  })

  it('allows only the configured Supabase origin for private PDF framing', () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key'
    const csp = buildContentSecurityPolicy('test-nonce', true)
    expect(csp).toContain('frame-src')
    expect(csp).toContain('https://project.supabase.co')
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey
  })

  it('keeps production code on local QR and dynamic scanner loading', () => {
    const sourceRoot = path.resolve(process.cwd(), 'src')
    const relevant = [
      'components/MemberCard.tsx',
      'components/LocalMemberQr.tsx',
      'app/volunteer/page.tsx',
      'app/volunteer/checkin/page.tsx',
    ].map((relative) => readFileSync(path.join(sourceRoot, relative), 'utf8')).join('\n')
    expect(relevant).not.toContain('api.qrserver.com')
    expect(relevant).toContain("import('html5-qrcode')")
    expect(relevant).toContain("from 'qrcode'")
    const eventSource = readFileSync(path.resolve(process.cwd(), 'src/app/events/[id]/page.tsx'), 'utf8')
    expect((eventSource.match(/src=\{event\.pdfUrl\}/g) || []).length).toBe(2)
    expect((eventSource.match(/sandbox=""/g) || []).length).toBe(2)
  })

  it('keeps optimized image configuration restricted to approved paths', () => {
    const nextConfigSource = readFileSync(path.resolve(process.cwd(), 'next.config.js'), 'utf8')
    expect(nextConfigSource).not.toContain('unoptimized: true')
    expect(nextConfigSource).not.toContain('dangerouslyAllowSVG: true')
    expect(nextConfigSource).not.toContain('images.unsplash.com')
    expect(nextConfigSource).not.toContain('ui-avatars.com')
    expect(nextConfigSource).toContain("hostname: 'res.cloudinary.com'")
    expect(nextConfigSource).toContain("pathname: `/${cloudinaryCloudName}/image/upload/**`")
  })
})
