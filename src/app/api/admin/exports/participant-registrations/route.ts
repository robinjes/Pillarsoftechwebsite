import { NextResponse } from 'next/server'

import { contentErrorResponse } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { listParticipantRegistrations } from '@/lib/content-repository'
import { toCsv } from '@/lib/content-contracts'

const eventIdPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const eventId = new URL(request.url).searchParams.get('eventId')?.trim() ?? ''
  if (!eventIdPattern.test(eventId)) return NextResponse.json({ error: 'A valid eventId is required.' }, { status: 400 })
  try {
    const registrations = await listParticipantRegistrations(eventId)
    const answerKeys = new Set<string>()
    for (const registration of registrations) {
      const answers = registration.submitted_data && typeof registration.submitted_data === 'object' && !Array.isArray(registration.submitted_data)
        ? registration.submitted_data as Record<string, unknown>
        : {}
      Object.keys(answers).forEach((key) => answerKeys.add(key))
    }
    const columns = ['confirmationId', 'eventId', 'createdAt', ...Array.from(answerKeys).sort()]
    const rows = registrations.map((registration) => {
      const answers = registration.submitted_data && typeof registration.submitted_data === 'object' && !Array.isArray(registration.submitted_data)
        ? registration.submitted_data as Record<string, unknown>
        : {}
      return {
        confirmationId: registration.id,
        eventId: registration.event_id,
        createdAt: registration.created_at,
        ...answers,
      }
    })
    return new NextResponse(toCsv(rows, columns), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="participant-registrations-${eventId}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return contentErrorResponse(error, 'Registration export could not be created.')
  }
}
