import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { jsonNoStore } from '@/lib/volunteer-api'
import { listEventRoster } from '@/lib/volunteer-server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { volunteerEventIdSchema } from '@/lib/volunteer-contracts'

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const eventId = new URL(request.url).searchParams.get('eventId') || ''
  const parsed = volunteerEventIdSchema.safeParse(eventId)
  if (!parsed.success) return jsonNoStore({ error: 'invalid_request', message: 'A valid eventId is required.' }, 400)
  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Staff service is not configured.' }, 503)
  try {
    return jsonNoStore({ roster: await listEventRoster(client, parsed.data) })
  } catch {
    return jsonNoStore({ error: 'service_unavailable', message: 'Event volunteer roster is temporarily unavailable.' }, 503)
  }
}
