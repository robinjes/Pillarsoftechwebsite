import { z } from 'zod'
import { judgingFailure } from '@/lib/judging-api'
import { getJudgingAudienceState } from '@/lib/judging-server'
import { jsonNoStore } from '@/lib/volunteer-api'

/** Public, read-only projection; scores are omitted until the host releases them. */
export async function GET(request: Request) {
  const eventId = z.uuid().safeParse(new URL(request.url).searchParams.get('eventId'))
  if (!eventId.success) return jsonNoStore({ error: 'Invalid event link.' }, 400)
  try {
    return jsonNoStore(await getJudgingAudienceState(eventId.data))
  } catch (error) {
    return judgingFailure(error, 'Event updates are temporarily unavailable.')
  }
}
