import { readJson } from '@/lib/admin-api'
import { judgeLoginSchema } from '@/lib/judging-contracts'
import { allowJudgeLoginAttempt, clearJudgeCookie, setJudgeCookie, signInJudge } from '@/lib/judging-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

/** Sign a judge in with the personal code the host gave them. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = judgeLoginSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'That code doesn’t look right. Codes are 6 letters and numbers.' }, 400)

  try {
    if (!await allowJudgeLoginAttempt(request)) {
      return jsonNoStore({ error: 'Too many attempts. Please wait a minute and try again.' }, 429)
    }
    const judge = await signInJudge(parsed.data.code)
    if (!judge) return jsonNoStore({ error: 'That code didn’t work. Check it with the event host.' }, 401)
    const response = jsonNoStore({ ok: true })
    setJudgeCookie(response, judge.judgeId)
    return response
  } catch {
    return jsonNoStore({ error: 'Judging is temporarily unavailable. Please try again.' }, 503)
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return sameOriginFailure()
  const response = jsonNoStore({ ok: true })
  clearJudgeCookie(response)
  return response
}
