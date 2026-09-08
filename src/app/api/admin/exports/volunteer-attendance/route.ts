import { NextResponse } from 'next/server'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { toCsv } from '@/lib/content-contracts'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { jsonNoStore } from '@/lib/volunteer-api'
import { listAllAttendanceRows } from '@/lib/volunteer-server'
import { volunteerEventIdSchema } from '@/lib/volunteer-contracts'

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const requestedEventId = new URL(request.url).searchParams.get('eventId')?.trim() || ''
  if (requestedEventId && !volunteerEventIdSchema.safeParse(requestedEventId).success) {
    return jsonNoStore({ error: 'invalid_request', message: 'A valid eventId is required.' }, 400)
  }
  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Staff service is not configured.' }, 503)
  try {
    const rows = await listAllAttendanceRows(client)
    const filtered = requestedEventId
      ? rows.filter(({ registration }) => registration.eventId === requestedEventId)
      : rows
    const columns = ['eventId', 'eventTitle', 'name', 'email', 'memberCode', 'status', 'hours', 'checkedInAt', 'createdAt']
    const csv = toCsv(filtered.map(({ registration, profile }) => ({
      eventId: registration.eventId,
      eventTitle: registration.eventTitle,
      name: profile?.name || '',
      email: profile?.email || '',
      memberCode: profile?.memberCode || '',
      status: registration.status,
      hours: registration.hours,
      checkedInAt: registration.checkedInAt || '',
      createdAt: registration.createdAt,
    })), columns)
    const suffix = requestedEventId ? `-${requestedEventId}` : ''
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="volunteer-attendance${suffix}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return jsonNoStore({ error: 'service_unavailable', message: 'Attendance export is temporarily unavailable.' }, 503)
  }
}
