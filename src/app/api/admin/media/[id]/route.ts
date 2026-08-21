import { NextResponse } from 'next/server'
import { z } from 'zod'

import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { getPrivatePdfDelivery, MediaPipelineError } from '@/lib/media/server'

const mediaIdSchema = z.string().uuid()

function mediaErrorResponse(error: unknown) {
  if (error instanceof MediaPipelineError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
  return NextResponse.json(
    { error: 'media_pipeline_error', message: 'Private document delivery is temporarily unavailable.' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const { id } = await params
  if (!mediaIdSchema.safeParse(id).success) {
    return NextResponse.json(
      { error: 'media_not_found' },
      { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  try {
    const { url } = await getPrivatePdfDelivery(id)
    return NextResponse.redirect(url, {
      status: 307,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
