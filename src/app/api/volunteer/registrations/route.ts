import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedUser } from '@/lib/auth/server'
import { jsonNoStore } from '@/lib/volunteer-api'
import { listOwnRegistrations } from '@/lib/volunteer-server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return authFailureResponse(auth)
  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Volunteer service is not configured.' }, 503)
  try {
    return jsonNoStore({ registrations: await listOwnRegistrations(client, auth.user.id) })
  } catch {
    return jsonNoStore({ error: 'service_unavailable', message: 'Volunteer registration history is temporarily unavailable.' }, 503)
  }
}
