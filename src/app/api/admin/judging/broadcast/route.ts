import { z } from 'zod'
import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { judgingFailure } from '@/lib/judging-api'
import { createBroadcastToken } from '@/lib/judging-broadcast-server'
import { getJudgingEventDetail } from '@/lib/judging-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = z.strictObject({ eventId: z.uuid() }).safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid event.' }, 400)
  try {
    await getJudgingEventDetail(parsed.data.eventId)
    return jsonNoStore(createBroadcastToken(parsed.data.eventId))
  } catch (error) {
    return judgingFailure(error, 'OBS links could not be created.')
  }
}
