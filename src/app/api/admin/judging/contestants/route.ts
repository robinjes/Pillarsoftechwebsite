import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { judgingFailure } from '@/lib/judging-api'
import { contestantRemoveSchema, contestantsAddSchema } from '@/lib/judging-contracts'
import { addContestants, removeContestant } from '@/lib/judging-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = contestantsAddSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Add up to 100 students at a time. Names can be up to 80 characters, projects up to 120.' }, 400)
  try {
    await addContestants(parsed.data.eventId, parsed.data.entries)
    return jsonNoStore({ ok: true }, 201)
  } catch (error) {
    return judgingFailure(error, 'Students could not be added.')
  }
}

export async function DELETE(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = contestantRemoveSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid student.' }, 400)
  try {
    await removeContestant(parsed.data.contestantId)
    return jsonNoStore({ ok: true })
  } catch (error) {
    return judgingFailure(error, 'The student could not be removed.')
  }
}
