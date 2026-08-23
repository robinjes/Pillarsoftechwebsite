import { NextResponse } from 'next/server'

import { listPublicImpact } from '@/lib/content-repository'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await listPublicImpact(), {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' },
    })
  } catch {
    return NextResponse.json({ error: 'Public impact content is temporarily unavailable.' }, { status: 503 })
  }
}
