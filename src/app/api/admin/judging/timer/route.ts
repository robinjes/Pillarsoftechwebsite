import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { judgingFailure } from '@/lib/judging-api'
import { controlJudgingTimer } from '@/lib/judging-server'
import { timerControlSchema } from '@/lib/judging-timer'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = timerControlSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid timer control.' }, 400)
  try {
    await controlJudgingTimer(parsed.data)
    return jsonNoStore({ ok: true })
  } catch (error) {
    return judgingFailure(error, 'The timer could not be updated.')
  }
}
