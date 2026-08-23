import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { jsonNoStore } from '@/lib/volunteer-api'

export async function GET() {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Staff service is not configured.' }, 503)

  try {
    const [
      { data: profiles, error: profilesError },
      { data: staff, error: staffError },
      { data: events, error: eventsError },
      { data: registrations, error: registrationsError },
    ] = await Promise.all([
      client.from('profiles').select('id,full_name,email,total_hours').order('total_hours', { ascending: false }),
      client.from('staff_members').select('user_id'),
      client.from('events').select('id,title,status,starts_at,start_label').order('starts_at', { ascending: false, nullsFirst: false }),
      client.from('volunteer_registrations').select('event_id,status,hours'),
    ])

    if (profilesError || staffError || eventsError || registrationsError) {
      return jsonNoStore({ error: 'service_unavailable', message: 'Analytics are temporarily unavailable.' }, 503)
    }

    const staffIds = new Set((staff || []).map((row) => String(row.user_id)))
    const volunteerProfiles = (profiles || []).filter((profile) => !staffIds.has(String(profile.id)))
    const totalHoursLogged = volunteerProfiles.reduce((sum, profile) => sum + Math.max(0, Number(profile.total_hours || 0)), 0)
    const registrationRows = registrations || []
    const eventStats = (events || []).map((event) => {
      const rows = registrationRows.filter((row) => String(row.event_id) === String(event.id))
      return {
        id: String(event.id),
        title: String(event.title || event.id),
        date: String(event.start_label || event.starts_at || ''),
        volunteersAttended: rows.filter((row) => row.status === 'attended').length,
        volunteersRegistered: rows.length,
        totalHoursAwarded: rows.reduce((sum, row) => sum + Math.max(0, Number(row.hours || 0)), 0),
      }
    })
    const averageHoursPerVolunteer = volunteerProfiles.length > 0
      ? Math.round((totalHoursLogged / volunteerProfiles.length) * 100) / 100
      : 0
    return jsonNoStore({
      stats: {
        totalVolunteers: volunteerProfiles.length,
        totalStaff: staffIds.size,
        totalEvents: (events || []).length,
        totalHoursLogged,
        averageHoursPerVolunteer,
        upcomingEvents: (events || []).filter((event) => event.status === 'upcoming' || event.status === 'ongoing').length,
        completedEvents: (events || []).filter((event) => event.status === 'completed').length,
      },
      events: eventStats,
      topVolunteers: volunteerProfiles.slice(0, 10).map((profile) => ({
        id: String(profile.id),
        name: String(profile.full_name || 'POT Volunteer'),
        email: String(profile.email || ''),
        totalHours: Math.max(0, Number(profile.total_hours || 0)),
      })),
    })
  } catch {
    return jsonNoStore({ error: 'service_unavailable', message: 'Analytics are temporarily unavailable.' }, 503)
  }
}
