import { z } from 'zod'

import { readJson } from '@/lib/admin-api'
import { qnaUpvoteSchema } from '@/lib/qna-contracts'
import { allowQnaAction, getQnaVisitorToken, QnaNotFoundError, setQnaUpvote } from '@/lib/qna-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const questionIdSchema = z.uuid()

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return sameOriginFailure()

  const questionId = questionIdSchema.safeParse((await context.params).id)
  if (!questionId.success) return jsonNoStore({ error: 'Unknown question.' }, 404)

  const visitorToken = getQnaVisitorToken(request)
  if (!visitorToken) return jsonNoStore({ error: 'Please reload the page and try again.' }, 400)

  const parsed = qnaUpvoteSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid vote.' }, 400)

  try {
    if (!await allowQnaAction('vote', request, visitorToken)) {
      return jsonNoStore({ error: 'Too many votes. Please wait a moment.' }, 429)
    }
    const upvotes = await setQnaUpvote(questionId.data, visitorToken, parsed.data.upvoted)
    return jsonNoStore({ upvotes })
  } catch (error) {
    if (error instanceof QnaNotFoundError) return jsonNoStore({ error: 'That question is no longer available.' }, 404)
    return jsonNoStore({ error: 'Votes are temporarily unavailable.' }, 503)
  }
}
