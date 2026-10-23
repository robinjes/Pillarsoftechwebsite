import { z } from 'zod'

import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { qnaAdminSessionCreateSchema, qnaAdminSessionUpdateSchema } from '@/lib/qna-contracts'
import {
  createQnaSession,
  getAdminQnaSnapshot,
  QnaNotFoundError,
  updateQnaSession,
} from '@/lib/qna-server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const sessionIdSchema = z.uuid()

function failure(error: unknown, fallback: string) {
  if (error instanceof QnaNotFoundError) return jsonNoStore({ error: error.message }, 404)
  return jsonNoStore({ error: fallback }, 503)
}

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const requested = new URL(request.url).searchParams.get('sessionId')
  const sessionId = requested ? sessionIdSchema.safeParse(requested) : null
  if (sessionId && !sessionId.success) return jsonNoStore({ error: 'Invalid session.' }, 400)

  try {
    return jsonNoStore(await getAdminQnaSnapshot(sessionId?.data ?? null))
  } catch (error) {
    return failure(error, 'Q&A could not be loaded.')
  }
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = qnaAdminSessionCreateSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Session titles must be 1 to 120 characters.' }, 400)

  try {
    const id = await createQnaSession({ ...parsed.data, createdBy: auth.user.id })
    return jsonNoStore({ id }, 201)
  } catch (error) {
    return failure(error, 'The session could not be created.')
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = qnaAdminSessionUpdateSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid session update.' }, 400)

  try {
    await updateQnaSession(parsed.data)
    return jsonNoStore({ ok: true })
  } catch (error) {
    return failure(error, 'The session could not be updated.')
  }
}
