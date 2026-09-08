import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { readJson, jsonNoStore, sameOrigin, sameOriginFailure, safeRpcResponse } from '@/lib/volunteer-api'
import { mapAttendanceResult, staffAttendanceRequestSchema } from '@/lib/volunteer-contracts'

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = staffAttendanceRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'invalid_request', message: 'Only memberCode and eventId are accepted.' }, 400)
  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Staff service is not configured.' }, 503)
  try {
    const { data, error } = await client.rpc('staff_check_in_or_out', {
      p_member_code: parsed.data.memberCode,
      p_event_id: parsed.data.eventId,
    })
    if (error || !data) return safeRpcResponse(error, 'The attendance action could not be completed.')
    return jsonNoStore({ attendance: mapAttendanceResult(data) })
  } catch (error) {
    return safeRpcResponse(error, 'The attendance action could not be completed.')
  }
}
