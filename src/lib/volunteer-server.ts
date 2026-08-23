import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mapProfileDto,
  mapPublicProfileDto,
  mapRegistrationDto,
  type ActiveAttendanceDto,
  type EventRosterDto,
  type VolunteerProfileDto,
  type VolunteerRegistrationDto,
} from '@/lib/volunteer-contracts'

export type VolunteerServerClient = SupabaseClient

export class VolunteerDataError extends Error {
  status = 503

  constructor(message = 'Volunteer data is temporarily unavailable.', status = 503) {
    super(message)
    this.name = 'VolunteerDataError'
    this.status = status
  }
}

function assertNoError(error: { message?: string } | null, fallback: string): void {
  if (error) throw new VolunteerDataError(fallback)
}

export async function getProfile(
  client: VolunteerServerClient,
  userId: string,
  isStaff: boolean,
): Promise<VolunteerProfileDto> {
  const { data, error } = await client
    .from('profiles')
    .select('id,full_name,email,member_code,created_at,total_hours')
    .eq('id', userId)
    .maybeSingle()
  assertNoError(error, 'Volunteer profile is temporarily unavailable.')
  if (!data) throw new VolunteerDataError('Volunteer profile is not available yet.')
  return mapProfileDto(data, isStaff)
}

export async function listStaffProfiles(
  client: VolunteerServerClient,
  search = '',
): Promise<VolunteerProfileDto[]> {
  let query = client
    .from('profiles')
    .select('id,full_name,email,member_code,created_at,total_hours')
    .order('created_at', { ascending: false })
    .limit(100)
  const normalized = search.trim()
  if (normalized && !/^[A-Za-z0-9@ ._-]{1,80}$/.test(normalized)) {
    throw new VolunteerDataError('Use letters, numbers, spaces, and basic punctuation for search.', 400)
  }
  if (normalized) {
    query = query.or(`full_name.ilike.%${normalized}%,email.ilike.%${normalized}%,member_code.ilike.%${normalized}%`)
  }
  const [{ data: profiles, error: profilesError }, { data: staff, error: staffError }] = await Promise.all([
    query,
    client.from('staff_members').select('user_id'),
  ])
  assertNoError(profilesError, 'Volunteer profiles are temporarily unavailable.')
  assertNoError(staffError, 'Staff membership is temporarily unavailable.')
  const staffIds = new Set((staff || []).map((member) => String(member.user_id)))
  return (profiles || []).map((profile) => mapProfileDto(profile, staffIds.has(String(profile.id))))
}

async function eventTitles(
  client: VolunteerServerClient,
  eventIds: string[],
): Promise<Map<string, string>> {
  if (eventIds.length === 0) return new Map()
  const { data, error } = await client.from('events').select('id,title').in('id', eventIds)
  assertNoError(error, 'Event information is temporarily unavailable.')
  return new Map((data || []).map((event) => [String(event.id), String(event.title || 'Volunteer event')]))
}

export async function getEventTitle(client: VolunteerServerClient, eventId: string): Promise<string> {
  const titles = await eventTitles(client, [eventId])
  return titles.get(eventId) || 'Volunteer event'
}

export async function listOwnRegistrations(
  client: VolunteerServerClient,
  userId: string,
): Promise<VolunteerRegistrationDto[]> {
  const { data, error } = await client
    .from('volunteer_registrations')
    .select('id,user_id,event_id,status,hours,checked_in_at,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  assertNoError(error, 'Volunteer registration history is temporarily unavailable.')
  const rows = data || []
  const titles = await eventTitles(client, rows.map((row) => String(row.event_id)))
  return rows.map((row) => mapRegistrationDto(row, titles.get(String(row.event_id)) || 'Volunteer event'))
}

export async function listEventRoster(
  client: VolunteerServerClient,
  eventId: string,
): Promise<EventRosterDto[]> {
  const { data: rows, error: registrationError } = await client
    .from('volunteer_registrations')
    .select('id,user_id,event_id,status,hours,checked_in_at,created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  assertNoError(registrationError, 'Event volunteer roster is temporarily unavailable.')
  const registrations = rows || []
  const userIds = Array.from(new Set(registrations.map((row) => String(row.user_id))))
  const [{ data: profiles, error: profileError }, titles] = await Promise.all([
    userIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : client.from('profiles').select('id,full_name,email,member_code,created_at,total_hours').in('id', userIds),
    eventTitles(client, [eventId]),
  ])
  assertNoError(profileError, 'Volunteer profiles are temporarily unavailable.')
  const profileById = new Map((profiles || []).map((profile) => [String(profile.id), mapPublicProfileDto(profile)]))
  return registrations.map((row) => ({
    signup: mapRegistrationDto(row, titles.get(eventId) || 'Volunteer event'),
    profile: profileById.get(String(row.user_id)) || null,
  }))
}

export async function listActiveAttendance(
  client: VolunteerServerClient,
): Promise<ActiveAttendanceDto[]> {
  const { data: sessions, error: sessionError } = await client
    .from('attendance_sessions')
    .select('id,user_id,event_id,check_in_at,hours_logged')
    .is('check_out_at', null)
    .order('check_in_at', { ascending: false })
  assertNoError(sessionError, 'Active attendance is temporarily unavailable.')
  const rows = sessions || []
  const userIds = Array.from(new Set(rows.map((row) => String(row.user_id))))
  const { data: profiles, error: profileError } = userIds.length === 0
    ? { data: [], error: null }
    : await client.from('profiles').select('id,full_name,email,member_code,created_at,total_hours').in('id', userIds)
  assertNoError(profileError, 'Volunteer profiles are temporarily unavailable.')
  const profileById = new Map((profiles || []).map((profile) => [String(profile.id), mapPublicProfileDto(profile)]))
  return rows.flatMap((row) => {
    const profile = profileById.get(String(row.user_id))
    if (!profile) return []
    const hours = Number(row.hours_logged || 0)
    return [{
      profile,
      eventId: String(row.event_id),
      checkInTime: String(row.check_in_at),
      sessionId: String(row.id),
      hoursLogged: Number.isFinite(hours) ? hours : 0,
    }]
  })
}

export async function listAllAttendanceRows(client: VolunteerServerClient) {
  const { data: rows, error } = await client
    .from('volunteer_registrations')
    .select('id,user_id,event_id,status,hours,checked_in_at,created_at')
    .order('created_at', { ascending: true })
  assertNoError(error, 'Volunteer attendance is temporarily unavailable.')
  const registrations = rows || []
  const userIds = Array.from(new Set(registrations.map((row) => String(row.user_id))))
  const eventIds = Array.from(new Set(registrations.map((row) => String(row.event_id))))
  const [{ data: profiles, error: profileError }, titles] = await Promise.all([
    userIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : client.from('profiles').select('id,full_name,email,member_code,created_at,total_hours').in('id', userIds),
    eventTitles(client, eventIds),
  ])
  assertNoError(profileError, 'Volunteer profiles are temporarily unavailable.')
  const profileById = new Map((profiles || []).map((profile) => [String(profile.id), mapPublicProfileDto(profile)]))
  return registrations.map((row) => ({
    registration: mapRegistrationDto(row, titles.get(String(row.event_id)) || 'Volunteer event'),
    profile: profileById.get(String(row.user_id)) || null,
  }))
}
