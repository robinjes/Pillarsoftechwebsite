import { NextResponse } from 'next/server'
import { authFailureResponse } from '@/lib/auth/http'
import { getVerifiedAuthContext } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await getVerifiedAuthContext()
  if (!auth.ok) return authFailureResponse(auth)

  const client = await createSupabaseServerClient()
  if (!client) {
    return NextResponse.json(
      { error: 'configuration_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, member_code, created_at')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { error: 'profile_unavailable', message: 'Volunteer profile is not available yet.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  return NextResponse.json(
    {
      profile: {
        ...data,
        role: auth.isStaff ? 'staff' : 'volunteer',
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
