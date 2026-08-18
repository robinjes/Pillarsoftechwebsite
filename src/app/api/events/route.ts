import { NextResponse } from 'next/server'

import { ContentRepositoryError, listPublicEvents } from '@/lib/content-repository'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await listPublicEvents(), {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    const status = error instanceof ContentRepositoryError ? error.status : 503
    return NextResponse.json({ error: 'Public event content is temporarily unavailable.' }, { status })
  }
}
