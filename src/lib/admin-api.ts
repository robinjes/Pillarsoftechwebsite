import { NextResponse } from 'next/server'

import { ContentRepositoryError } from '@/lib/content-repository'

export function contentErrorResponse(error: unknown, fallback = 'Content operation failed.') {
  if (error instanceof ContentRepositoryError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return NextResponse.json({ error: fallback }, { status: 503 })
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
