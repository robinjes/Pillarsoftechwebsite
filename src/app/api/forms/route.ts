import { NextResponse } from 'next/server'

import { getPublicParticipantForm } from '@/lib/content-repository'
import { formLookupSchema } from '@/lib/content-contracts'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const parsed = formLookupSchema.safeParse({
    eventId: searchParams.get('eventId') ?? '',
    kind: searchParams.get('kind') ?? 'participant',
  })
  if (!parsed.success || parsed.data.kind !== 'participant') {
    return NextResponse.json({ error: 'A single published eventId is required.' }, { status: 400 })
  }

  try {
    const form = await getPublicParticipantForm(parsed.data.eventId)
    if (!form) return NextResponse.json({ error: 'Active registration form not found.' }, { status: 404 })
    return NextResponse.json({
      eventId: form.eventId,
      kind: form.kind,
      fields: form.fields,
      isActive: form.isActive,
    }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
  } catch {
    return NextResponse.json({ error: 'Public form content is temporarily unavailable.' }, { status: 503 })
  }
}
