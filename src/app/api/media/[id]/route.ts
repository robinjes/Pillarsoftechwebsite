import { NextResponse } from 'next/server'
import { z } from 'zod'

import { MediaPipelineError, getMediaDelivery } from '@/lib/media/server'

const mediaIdSchema = z.string().uuid()

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!mediaIdSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'media_not_found' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
  }

  try {
    const { url } = await getMediaDelivery(id)
    return NextResponse.redirect(url, {
      status: 307,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    if (error instanceof MediaPipelineError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
    return NextResponse.json(
      { error: 'media_pipeline_error', message: 'Media delivery is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
