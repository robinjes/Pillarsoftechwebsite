import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { jsonNoStore } from '@/lib/volunteer-api'
import { listStaffProfiles, VolunteerDataError } from '@/lib/volunteer-server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const query = new URL(request.url).searchParams.get('q') || ''
  if (query && !/^[A-Za-z0-9@ ._-]{1,80}$/.test(query.trim())) {
    return jsonNoStore({ error: 'invalid_request', message: 'Use letters, numbers, spaces, and basic punctuation for search.' }, 400)
  }
  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Staff service is not configured.' }, 503)
  try {
    return jsonNoStore({ profiles: await listStaffProfiles(client, query) })
  } catch (error) {
    if (error instanceof VolunteerDataError && error.status === 400) {
      return jsonNoStore({ error: 'invalid_request', message: 'Use letters, numbers, spaces, and basic punctuation for search.' }, 400)
    }
    return jsonNoStore({ error: 'service_unavailable', message: 'Volunteer profiles are temporarily unavailable.' }, 503)
  }
}
