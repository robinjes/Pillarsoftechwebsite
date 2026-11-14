import { readJson } from '@/lib/admin-api'
import { feedbackSubmissionSchema } from '@/lib/feedback-contracts'
import { allowFeedbackSubmission, submitFeedback } from '@/lib/feedback-server'
import { getQnaVisitorToken } from '@/lib/qna-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return sameOriginFailure()

  const visitorToken = getQnaVisitorToken(request)
  if (!visitorToken) return jsonNoStore({ error: 'Please reload the page and try again.' }, 400)

  const parsed = feedbackSubmissionSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Please reload the page and try again.' }, 400)

  try {
    if (!await allowFeedbackSubmission(request, visitorToken)) {
      return jsonNoStore({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429)
    }
    const result = await submitFeedback({ ...parsed.data, visitorToken })
    if (result === 'closed') return jsonNoStore({ error: 'This feedback form is closed. Thank you anyway!' }, 409)
    if (result === 'duplicate') return jsonNoStore({ error: 'You already sent feedback from this device. Thank you!', duplicate: true }, 409)
    if (result !== 'ok') return jsonNoStore(result, 400)
    return jsonNoStore({ ok: true }, 201)
  } catch {
    // Limiter, pepper, and database failures look identical to callers.
    return jsonNoStore({ error: 'Feedback could not be sent right now. Please try again.' }, 503)
  }
}
