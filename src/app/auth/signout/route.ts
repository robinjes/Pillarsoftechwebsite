import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return sameOriginFailure()

  const client = await createSupabaseServerClient()
  if (!client) {
    return NextResponse.json(
      { error: 'configuration_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  const { error } = await client.auth.signOut()
  if (error) {
    return NextResponse.json(
      { error: 'signout_failed' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  return NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
