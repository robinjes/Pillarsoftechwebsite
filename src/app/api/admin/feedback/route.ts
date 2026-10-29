import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { feedbackFormCreateSchema, feedbackFormDeleteSchema, feedbackFormUpdateSchema } from '@/lib/feedback-contracts'
import {
  createFeedbackForm,
  deleteFeedbackForm,
  FeedbackConflictError,
  FeedbackNotFoundError,
  getAdminFeedbackSnapshot,
  updateFeedbackForm,
} from '@/lib/feedback-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

function failure(error: unknown, fallback: string) {
  if (error instanceof FeedbackNotFoundError) return jsonNoStore({ error: error.message }, 404)
  if (error instanceof FeedbackConflictError) return jsonNoStore({ error: error.message }, 409)
  return jsonNoStore({ error: fallback }, 503)
}

export async function GET() {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  try {
    return jsonNoStore(await getAdminFeedbackSnapshot())
  } catch (error) {
    return failure(error, 'Feedback forms could not be loaded.')
  }
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = feedbackFormCreateSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Form titles must be 1 to 120 characters.' }, 400)

  try {
    const id = await createFeedbackForm({ ...parsed.data, createdBy: auth.user.id })
    return jsonNoStore({ id }, 201)
  } catch (error) {
    return failure(error, 'The form could not be created.')
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = feedbackFormUpdateSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid form update.' }, 400)

  try {
    await updateFeedbackForm(parsed.data)
    return jsonNoStore({ ok: true })
  } catch (error) {
    return failure(error, 'The form could not be updated.')
  }
}

export async function DELETE(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = feedbackFormDeleteSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid form.' }, 400)

  try {
    await deleteFeedbackForm(parsed.data.formId)
    return jsonNoStore({ ok: true })
  } catch (error) {
    return failure(error, 'The form could not be deleted.')
  }
}
