import { NextResponse } from 'next/server'

import { ContentRepositoryError, listPublicEvents } from '@/lib/content-repository'
import { branchCodeSchema } from '@/lib/content-contracts'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const value = new URL(request.url).searchParams.get('branch')?.trim()
    const parsedBranch = value ? branchCodeSchema.safeParse(value) : null
    if (value && !parsedBranch?.success) {
      return NextResponse.json({ error: 'Invalid event branch.' }, { status: 400 })
    }
    return NextResponse.json(await listPublicEvents(parsedBranch?.success ? parsedBranch.data : undefined), {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    const status = error instanceof ContentRepositoryError ? error.status : 503
    return NextResponse.json({ error: 'Public event content is temporarily unavailable.' }, { status })
  }
}
