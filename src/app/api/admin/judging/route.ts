import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { judgingEventCreateSchema, judgingEventDeleteSchema, judgingEventUpdateSchema } from '@/lib/judging-contracts'
import { judgingFailure } from '@/lib/judging-api'
import { createJudgingEvent, deleteJudgingEvent, getJudgingSnapshot, updateJudgingEvent } from '@/lib/judging-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function GET() {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  try {
    return jsonNoStore(await getJudgingSnapshot())
  } catch (error) {
    return judgingFailure(error, 'Judging events could not be loaded.')
  }
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = judgingEventCreateSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Event names must be 1 to 120 characters.' }, 400)
  try {
    return jsonNoStore({ id: await createJudgingEvent({ title: parsed.data.title, createdBy: auth.user.id }) }, 201)
  } catch (error) {
    return judgingFailure(error, 'The event could not be created.')
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = judgingEventUpdateSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid event update.' }, 400)
  try {
    await updateJudgingEvent(parsed.data)
    return jsonNoStore({ ok: true })
  } catch (error) {
    return judgingFailure(error, 'The event could not be updated.')
  }
}

export async function DELETE(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = judgingEventDeleteSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid event.' }, 400)
  try {
    await deleteJudgingEvent(parsed.data.eventId)
    return jsonNoStore({ ok: true })
  } catch (error) {
    return judgingFailure(error, 'The event could not be deleted.')
  }
}
