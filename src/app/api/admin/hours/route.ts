import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { readJson, jsonNoStore, sameOrigin, sameOriginFailure, safeRpcResponse } from '@/lib/volunteer-api'
import { mapProfileDto, staffHoursRequestSchema } from '@/lib/volunteer-contracts'

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = staffHoursRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'invalid_request', message: 'Use userId, a nonzero delta, and a meaningful reason.' }, 400)
  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Staff service is not configured.' }, 503)
  try {
    const { data, error } = await client.rpc('staff_adjust_volunteer_hours', {
      p_user_id: parsed.data.userId,
      p_hours: parsed.data.delta,
      p_reason: parsed.data.reason,
    })
    if (error || !data) return safeRpcResponse(error, 'The hour adjustment could not be recorded.')
    return jsonNoStore({ profile: mapProfileDto(data, false) })
  } catch (error) {
    return safeRpcResponse(error, 'The hour adjustment could not be recorded.')
  }
}
