import { readJson } from '@/lib/admin-api'
import { qnaQuestionSubmissionSchema } from '@/lib/qna-contracts'
import { allowQnaAction, getQnaVisitorToken, submitQnaQuestion } from '@/lib/qna-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return sameOriginFailure()

  const visitorToken = getQnaVisitorToken(request)
  if (!visitorToken) return jsonNoStore({ error: 'Please reload the page and try again.' }, 400)

  const parsed = qnaQuestionSubmissionSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Questions must be between 3 and 300 characters.' }, 400)

  try {
    if (!await allowQnaAction('question', request, visitorToken)) {
      return jsonNoStore({ error: 'You are asking questions quickly. Please wait a minute and try again.' }, 429)
    }
    const question = await submitQnaQuestion({ ...parsed.data, visitorToken })
    if (question === 'closed') return jsonNoStore({ error: 'Questions are closed right now.' }, 409)
    return jsonNoStore({ question }, 201)
  } catch {
    // Limiter, pepper, and database failures look identical to callers.
    return jsonNoStore({ error: 'Questions could not be sent right now. Please try again.' }, 503)
  }
}
