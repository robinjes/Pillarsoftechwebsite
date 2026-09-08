import { NextResponse } from 'next/server'

import { ContentRepositoryError } from '@/lib/content-repository'

export function contentErrorResponse(error: unknown, fallback = 'Content operation failed.') {
  // Repository errors never forward Postgres/Supabase detail. Preserve the
  // explicitly safe not-found/conflict status, but use the route fallback for
  // the body so a future repository error message cannot leak through.
  if (error instanceof ContentRepositoryError && (error.status === 404 || error.status === 409)) {
    return NextResponse.json({ error: fallback }, { status: error.status })
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
