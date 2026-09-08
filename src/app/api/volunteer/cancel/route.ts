import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedUser } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { readJson, jsonNoStore, sameOrigin, sameOriginFailure, safeRpcResponse } from '@/lib/volunteer-api'
import { volunteerEventRequestSchema } from '@/lib/volunteer-contracts'

export async function POST(request: Request) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = volunteerEventRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'invalid_request', message: 'Only a valid eventId is accepted.' }, 400)

  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Volunteer service is not configured.' }, 503)
  try {
    const { error } = await client.rpc('cancel_event_registration', { p_event_id: parsed.data.eventId })
    if (error) return safeRpcResponse(error, 'This registration is not eligible for cancellation.')
    return jsonNoStore({ eventId: parsed.data.eventId, cancelled: true })
  } catch (error) {
    return safeRpcResponse(error, 'This registration is not eligible for cancellation.')
  }
}
