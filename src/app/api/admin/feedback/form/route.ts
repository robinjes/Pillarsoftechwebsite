import { z } from 'zod'

import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { FeedbackNotFoundError, getFeedbackResults } from '@/lib/feedback-server'
import { jsonNoStore } from '@/lib/volunteer-api'

const formIdSchema = z.uuid()

/** One form's questions and responses, for the editor and results views. */
export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const formId = formIdSchema.safeParse(new URL(request.url).searchParams.get('formId'))
  if (!formId.success) return jsonNoStore({ error: 'Invalid form.' }, 400)

  try {
    return jsonNoStore(await getFeedbackResults(formId.data))
  } catch (error) {
    if (error instanceof FeedbackNotFoundError) return jsonNoStore({ error: error.message }, 404)
    return jsonNoStore({ error: 'Feedback could not be loaded.' }, 503)
  }
}
