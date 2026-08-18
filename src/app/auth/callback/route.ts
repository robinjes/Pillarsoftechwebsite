import { NextResponse } from 'next/server'
import { getSafeNextPath } from '@/lib/auth/redirect'
import { getSiteUrl } from '@/lib/supabase/config'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const isLocalRequest =
    requestUrl.protocol === 'http:' &&
    (requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1')
  const trustedOrigin = getSiteUrl() || (isLocalRequest ? requestUrl.origin : null)

  if (!trustedOrigin) {
    return NextResponse.json(
      {
        error: 'configuration_unavailable',
        message: 'The canonical site origin is not configured for OAuth redirects.',
      },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  const next = getSafeNextPath(requestUrl.searchParams.get('next'))
  const redirectToLogin = (error: string) => {
    const loginUrl = new URL('/admin/login', trustedOrigin)
    loginUrl.searchParams.set('error', error)
    return NextResponse.redirect(loginUrl)
  }

  const code = requestUrl.searchParams.get('code')
  if (!code) return redirectToLogin('callback')

  const client = await createSupabaseServerClient()
  if (!client) return redirectToLogin('configuration')

  const { error } = await client.auth.exchangeCodeForSession(code)
  if (error) return redirectToLogin('callback')

  return NextResponse.redirect(new URL(next, trustedOrigin))
}
