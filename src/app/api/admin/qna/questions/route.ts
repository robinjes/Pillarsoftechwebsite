import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { qnaAdminQuestionUpdateSchema } from '@/lib/qna-contracts'
import { QnaNotFoundError, updateQnaQuestionStatus } from '@/lib/qna-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

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
