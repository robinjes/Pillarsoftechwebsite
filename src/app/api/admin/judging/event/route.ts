import { z } from 'zod'

import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { judgingFailure } from '@/lib/judging-api'
import { getJudgingEventDetail } from '@/lib/judging-server'
import { jsonNoStore } from '@/lib/volunteer-api'

const eventIdSchema = z.uuid()

/** One event's students, judges and codes, and every score. */
export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const eventId = eventIdSchema.safeParse(new URL(request.url).searchParams.get('eventId'))
  if (!eventId.success) return jsonNoStore({ error: 'Invalid event.' }, 400)
  try {
    return jsonNoStore(await getJudgingEventDetail(eventId.data))
  } catch (error) {
    return judgingFailure(error, 'The event could not be loaded.')
  }
}
