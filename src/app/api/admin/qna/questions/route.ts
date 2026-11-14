import { z } from 'zod'

import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { qnaAdminQuestionUpdateSchema } from '@/lib/qna-contracts'
import { getAdminSessionQuestions, QnaNotFoundError, updateQnaQuestionStatus } from '@/lib/qna-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const sessionIdSchema = z.uuid()

/** Questions for one session, used by the Past sessions list. */
export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const sessionId = sessionIdSchema.safeParse(new URL(request.url).searchParams.get('sessionId'))
  if (!sessionId.success) return jsonNoStore({ error: 'Invalid session.' }, 400)

  try {
    return jsonNoStore({ questions: await getAdminSessionQuestions(sessionId.data) })
  } catch (error) {
    if (error instanceof QnaNotFoundError) return jsonNoStore({ error: error.message }, 404)
    return jsonNoStore({ error: 'Questions could not be loaded.' }, 503)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = qnaAdminQuestionUpdateSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid question update.' }, 400)

  try {
    await updateQnaQuestionStatus(parsed.data.questionId, parsed.data.status)
    return jsonNoStore({ ok: true })
  } catch (error) {
    if (error instanceof QnaNotFoundError) return jsonNoStore({ error: error.message }, 404)
    return jsonNoStore({ error: 'The question could not be updated.' }, 503)
  }
}
