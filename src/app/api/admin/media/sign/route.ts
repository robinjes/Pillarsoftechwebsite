import { NextResponse } from 'next/server'

import { readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { MediaPipelineError, parseMediaSignRequest, signMediaUpload } from '@/lib/media/server'
import { sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

function mediaErrorResponse(error: unknown) {
  if (error instanceof MediaPipelineError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
  return NextResponse.json(
    { error: 'media_pipeline_error', message: 'Media signing is temporarily unavailable.' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  try {
    const input = parseMediaSignRequest(await readJson(request))
    const result = await signMediaUpload(input, auth.user.id)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
