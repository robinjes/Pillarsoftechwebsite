import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { audienceControlSchema } from '@/lib/judging-audience'
import { judgingFailure } from '@/lib/judging-api'
import { controlJudgingAudience } from '@/lib/judging-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const input = audienceControlSchema.safeParse(await readJson(request))
  if (!input.success) return jsonNoStore({ error: 'Invalid parent-page update. Awards information must be at most 240 characters.' }, 400)
  try {
    await controlJudgingAudience(input.data)
    return jsonNoStore({ ok: true })
  } catch (error) {
    return judgingFailure(error, 'The parent page could not be updated.')
  }
}
