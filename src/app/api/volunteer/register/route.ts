import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedUser } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { readJson, jsonNoStore, sameOrigin, sameOriginFailure, safeRpcResponse } from '@/lib/volunteer-api'
import { volunteerEventRequestSchema } from '@/lib/volunteer-contracts'
import { getEventTitle } from '@/lib/volunteer-server'
import { mapRegistrationDto } from '@/lib/volunteer-contracts'

export async function POST(request: Request) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = volunteerEventRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'invalid_request', message: 'Only a valid eventId is accepted.' }, 400)

  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Volunteer service is not configured.' }, 503)
  try {
    const { data, error } = await client.rpc('register_for_event', { p_event_id: parsed.data.eventId })
    if (error || !data) return safeRpcResponse(error, 'This event is not open for volunteer registration.')
    const title = await getEventTitle(client, parsed.data.eventId).catch(() => 'Volunteer event')
    return jsonNoStore({ registration: mapRegistrationDto(Array.isArray(data) ? data[0] : data, title) }, 201)
  } catch (error) {
    return safeRpcResponse(error, 'This event is not open for volunteer registration.')
  }
}
