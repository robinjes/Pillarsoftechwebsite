import { randomBytes } from 'node:crypto'

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getSupabasePublicConfig } from '@/lib/supabase/config'

const STATIC_FILE_PATTERN = /\.(?:css|csv|gif|ico|jpeg|jpg|js|json|map|mov|mp3|mp4|pdf|png|svg|txt|webm|webmanifest|woff2?)$/i

export function isDocumentRequest(request: Pick<NextRequest, 'method' | 'nextUrl' | 'headers'>): boolean {
  const pathname = request.nextUrl.pathname
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || STATIC_FILE_PATTERN.test(pathname)) return false
  if (/^\/(?:favicon\.ico|apple-touch-icon(?:-precomposed)?\.png|manifest\.webmanifest|robots\.txt|sitemap\.xml)$/.test(pathname)) return false
  const accept = request.headers.get('accept')
  return !accept || accept.includes('text/html')
}

function supabaseOrigin(): string | null {
  const config = getSupabasePublicConfig()
  if (!config) return null
  try {
    return new URL(config.url).origin
  } catch {
    return null
  }
}

export function buildContentSecurityPolicy(
  nonce: string,
  production = process.env.NODE_ENV === 'production',
  upgradeInsecure = production,
): string {
  const origin = supabaseOrigin()
  const supabaseSource = origin ? ` ${origin}` : ''
  const cloudinarySource = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ? ' https://res.cloudinary.com' : ''
  const scriptSources = `'self' 'nonce-${nonce}' 'strict-dynamic'${production ? '' : " 'unsafe-eval'"}`
  const productionOnly = production && upgradeInsecure ? '; upgrade-insecure-requests' : ''

  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: blob:${cloudinarySource}${supabaseSource}`,
    `media-src 'self' blob:${supabaseSource}`,
    `connect-src 'self' blob:${supabaseSource}`,
    `frame-src 'self' https://hcb.hackclub.com https://docs.google.com https://forms.gle https://www.youtube-nocookie.com https://youtube-nocookie.com${supabaseSource}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ') + productionOnly
}

export function applySecurityHeaders(response: NextResponse, csp?: string): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), usb=(), payment=(), browsing-topics=()')
  if (csp) response.headers.set('Content-Security-Policy', csp)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  return response
}

/**
 * These endpoints authenticate independently of the browser cookie session.
 * Keep this exact-path allowlist narrow: a broad API bypass would let a future
 * route accidentally skip the normal Supabase session refresh boundary.
 */
export function isIndependentlyAuthenticatedPath(pathname: string): boolean {
  return pathname === '/api/integrations/discord/interactions'
}

export async function middleware(request: NextRequest) {
  const documentRequest = isDocumentRequest(request)
  const nonce = documentRequest ? randomBytes(16).toString('base64') : null
  const forwardedHeaders = new Headers(request.headers)
  const isLocalHttp = request.nextUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(request.nextUrl.hostname)
  const csp = nonce ? buildContentSecurityPolicy(nonce, undefined, !isLocalHttp) : undefined
  if (nonce && csp) {
    forwardedHeaders.set('x-nonce', nonce)
    forwardedHeaders.set('Content-Security-Policy', csp)
  }

  const response = NextResponse.next({ request: { headers: forwardedHeaders } })
  const config = getSupabasePublicConfig()
  if (config && !isIndependentlyAuthenticatedPath(request.nextUrl.pathname)) {
    const client = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    // Middleware only refreshes the cookie session. Protected layouts and API
    // handlers perform the actual getUser + staff-membership authorization.
    try {
      await client.auth.getUser()
    } catch {
      // Session refresh is best-effort here. Public documents still receive
      // security headers; protected layouts and APIs authorize independently.
    }
  }

  applySecurityHeaders(response, csp)
  const privateNoStorePrefixes = [
    '/admin',
    '/auth',
    '/api/admin',
    '/api/chat',
    '/api/contact',
    '/api/auth',
    '/api/me',
    '/api/registrations',
    '/api/volunteer',
    '/api/media',
    '/api/integrations/discord/interactions',
    '/register',
    '/volunteer/checkin',
  ]
  if (privateNoStorePrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`))) {
    response.headers.set('Cache-Control', 'private, no-store')
  }
  return response
}

export const runtime = 'nodejs'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|mov|pdf|css|js|map|woff2?)$).*)'],
}
