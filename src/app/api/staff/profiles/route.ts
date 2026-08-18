import { NextResponse } from 'next/server'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const client = await createSupabaseServerClient()
  if (!client) return NextResponse.json({ error: 'configuration_unavailable' }, { status: 503 })

  const query = new URL(request.url).searchParams.get('q')?.trim() || ''
  let profileQuery = client
    .from('profiles')
    .select('id, full_name, email, member_code, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (query) {
    const escaped = query.replace(/[%_,]/g, '')
    profileQuery = profileQuery.or(
      `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,member_code.ilike.%${escaped}%`
    )
  }

  const [{ data: profiles, error: profilesError }, { data: staff, error: staffError }] =
    await Promise.all([
      profileQuery,
      client.from('staff_members').select('user_id'),
    ])

  if (profilesError || staffError) {
    return NextResponse.json(
      { error: 'authorization_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  const staffIds = new Set((staff || []).map((member) => member.user_id))
  return NextResponse.json(
    {
      profiles: (profiles || []).map((profile) => ({
        ...profile,
        role: staffIds.has(profile.id) ? 'staff' : 'volunteer',
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
