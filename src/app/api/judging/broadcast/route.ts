import { judgingFailure } from '@/lib/judging-api'
import { broadcastSnapshot } from '@/lib/judging-broadcast'
import { verifyBroadcastToken } from '@/lib/judging-broadcast-server'
import { getJudgingEventDetail } from '@/lib/judging-server'
import { jsonNoStore } from '@/lib/volunteer-api'

export async function GET(request: Request) {
  try {
    const header = request.headers.get('authorization') ?? ''
    const eventId = header.startsWith('Bearer ') ? verifyBroadcastToken(header.slice(7)) : null
    if (!eventId) return jsonNoStore({ error: 'This OBS link is invalid or expired. Generate a new link in the admin judging panel.' }, 401)
    return jsonNoStore(broadcastSnapshot(await getJudgingEventDetail(eventId)))
  } catch (error) {
    return judgingFailure(error, 'The broadcast is temporarily unavailable.')
  }
}
