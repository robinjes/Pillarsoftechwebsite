import { readJson } from '@/lib/admin-api'
import { scoreSaveSchema } from '@/lib/judging-contracts'
import { getJudgeIdFromRequest, JudgingNotFoundError, saveJudgeScore } from '@/lib/judging-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

/** Save (autosave) one judge's rubric for one student. */
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return sameOriginFailure()

  const judgeId = getJudgeIdFromRequest(request)
  if (!judgeId) return jsonNoStore({ error: 'signed_out' }, 401)

  const parsed = scoreSaveSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Scores must be whole numbers from 1 to 10.' }, 400)

  try {
    const result = await saveJudgeScore(judgeId, parsed.data)
    if (result === 'signed_out') return jsonNoStore({ error: 'signed_out' }, 401)
    if (result === 'locked') return jsonNoStore({ error: 'Scores are locked. Ask the host if something needs fixing.', locked: true }, 409)
    return jsonNoStore({ score: result })
  } catch (error) {
    if (error instanceof JudgingNotFoundError) return jsonNoStore({ error: error.message }, 404)
    return jsonNoStore({ error: 'Your score could not be saved. It will retry.' }, 503)
  }
}
