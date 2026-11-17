import { clearJudgeCookie, getJudgeIdFromRequest, getJudgeState } from '@/lib/judging-server'
import { jsonNoStore } from '@/lib/volunteer-api'

export const dynamic = 'force-dynamic'

/** Everything the signed-in judge's screen shows; polled every few seconds. */
export async function GET(request: Request) {
  const judgeId = getJudgeIdFromRequest(request)
  if (!judgeId) return jsonNoStore({ error: 'signed_out' }, 401)

  try {
    const state = await getJudgeState(judgeId)
    if (!state) {
      // The judge was removed or the event ended: send them back to sign-in.
      const response = jsonNoStore({ error: 'signed_out' }, 401)
      clearJudgeCookie(response)
      return response
    }
    return jsonNoStore(state)
  } catch {
    return jsonNoStore({ error: 'Judging is temporarily unavailable.' }, 503)
  }
}
