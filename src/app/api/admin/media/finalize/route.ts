import { NextResponse } from 'next/server'
import { z } from 'zod'

import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { finalizeMediaUpload, MediaPipelineError } from '@/lib/media/server'

const finalizeRequestSchema = z.object({ mediaId: z.string().uuid() }).strict()

function mediaErrorResponse(error: unknown) {
  if (error instanceof MediaPipelineError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
  return NextResponse.json(
    { error: 'media_pipeline_error', message: 'Media finalization is temporarily unavailable.' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const parsed = finalizeRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_media_request', message: 'A valid media id is required.' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  try {
    const result = await finalizeMediaUpload(parsed.data.mediaId, auth.user.id)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
