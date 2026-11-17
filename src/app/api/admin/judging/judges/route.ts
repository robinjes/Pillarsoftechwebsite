import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { judgingFailure } from '@/lib/judging-api'
import { judgeAddSchema, judgeRemoveSchema } from '@/lib/judging-contracts'
import { addJudge, removeJudge } from '@/lib/judging-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = judgeAddSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Judge names must be 1 to 80 characters.' }, 400)
  try {
    return jsonNoStore(await addJudge(parsed.data.eventId, parsed.data.name), 201)
  } catch (error) {
    return judgingFailure(error, 'The judge could not be added.')
  }
}

export async function DELETE(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = judgeRemoveSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid judge.' }, 400)
  try {
    await removeJudge(parsed.data.judgeId)
    return jsonNoStore({ ok: true })
  } catch (error) {
    return judgingFailure(error, 'The judge could not be removed.')
  }
}
