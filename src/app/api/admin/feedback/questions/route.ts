import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { feedbackQuestionsReplaceSchema } from '@/lib/feedback-contracts'
import { FeedbackNotFoundError, replaceFeedbackQuestions } from '@/lib/feedback-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

/** Save the whole question list for a form (add, edit, reorder, remove). */
export async function PUT(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = feedbackQuestionsReplaceSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    const choiceIssue = parsed.error.issues.find((issue) => issue.path.includes('options'))
    return jsonNoStore({
      error: choiceIssue
        ? 'Every multiple-choice or checkbox question needs at least two different options.'
        : 'Every question needs text (up to 300 characters), and a form can have at most 30 questions.',
    }, 400)
  }

  try {
    await replaceFeedbackQuestions(parsed.data.formId, parsed.data.questions)
    return jsonNoStore({ ok: true })
  } catch (error) {
    if (error instanceof FeedbackNotFoundError) return jsonNoStore({ error: 'This form or one of its questions was removed. Reload and try again.' }, 404)
    return jsonNoStore({ error: 'Questions could not be saved.' }, 503)
  }
}
