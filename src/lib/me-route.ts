import 'server-only'

import { authFailureResponse } from '@/lib/auth/http'
import { getVerifiedVolunteerAuthContext } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfile, VolunteerDataError } from '@/lib/volunteer-server'
import { jsonNoStore } from '@/lib/volunteer-api'

export async function getMeResponse() {
  const auth = await getVerifiedVolunteerAuthContext()
  if (!auth.ok) return authFailureResponse(auth)

  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Authentication is not configured on this server.' }, 503)

  try {
    const profile = await getProfile(client, auth.user.id, auth.isStaff, auth.user)
    return jsonNoStore({
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        memberCode: profile.memberCode,
        createdAt: profile.createdAt,
        totalHours: profile.totalHours,
        isStaff: auth.isStaff,
        role: auth.isStaff ? 'staff' : 'volunteer',
      },
    })
  } catch (error) {
    const status = error instanceof VolunteerDataError ? error.status : 503
    return jsonNoStore({ error: 'profile_unavailable', message: 'Volunteer profile is not available yet.' }, status)
  }
}
