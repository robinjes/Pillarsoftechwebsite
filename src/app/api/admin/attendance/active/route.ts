import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { jsonNoStore } from '@/lib/volunteer-api'
import { listActiveAttendance } from '@/lib/volunteer-server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Staff service is not configured.' }, 503)
  try {
    return jsonNoStore({ sessions: await listActiveAttendance(client) })
  } catch {
    return jsonNoStore({ error: 'service_unavailable', message: 'Active attendance is temporarily unavailable.' }, 503)
  }
}
