import 'server-only'

import { randomBytes } from 'node:crypto'
import type { User } from '@supabase/supabase-js'
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

const MODERN_PROFILE_COLUMNS = 'id,full_name,email,member_code,created_at,total_hours'
const LEGACY_PROFILE_COLUMNS = 'id,full_name,email,member_code,created_at'
const PROFILE_NAME_LIMIT = 160
const PROFILE_EMAIL_LIMIT = 320

type VerifiedProfileUser = Pick<User, 'id' | 'email' | 'user_metadata'>

type ProfileLookup = {
  data: unknown
}

async function readOwnProfile(
  client: VolunteerServerClient,
  userId: string,
): Promise<ProfileLookup> {
  const modern = await client
    .from('profiles')
    .select(MODERN_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (!modern.error) return { data: modern.data }

  // The production project can still be on the original profiles table,
  // which has no total_hours column. Retry only the safe identity projection;
  // in particular, never read the legacy role column.
  const legacy = await client
    .from('profiles')
    .select(LEGACY_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()
  assertNoError(legacy.error, 'Volunteer profile is temporarily unavailable.')
  return { data: legacy.data }
}

async function getVerifiedProfileUser(
  client: VolunteerServerClient,
  userId: string,
  providedUser?: VerifiedProfileUser,
): Promise<VerifiedProfileUser> {
  if (providedUser?.id === userId) return providedUser

  if (!client.auth || typeof client.auth.getUser !== 'function') {
    throw new VolunteerDataError('Volunteer profile is temporarily unavailable.')
  }

  const { data, error } = await client.auth.getUser()
  if (error || !data.user || data.user.id !== userId) {
    throw new VolunteerDataError('Volunteer profile is temporarily unavailable.')
  }
  return data.user
}

function boundedProfileName(user: VerifiedProfileUser): string {
  const metadata = user.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata as Record<string, unknown>
    : {}
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : ''
  const fallbackName = typeof metadata.name === 'string' ? metadata.name.trim() : ''
  const name = (fullName || fallbackName).slice(0, PROFILE_NAME_LIMIT)
  return name || 'POT Volunteer'
}

function boundedProfileEmail(user: VerifiedProfileUser): string {
  return (user.email || '').trim().slice(0, PROFILE_EMAIL_LIMIT)
}

function newMemberCode(): string {
  return `POT-${randomBytes(8).toString('hex').toUpperCase()}`
}

export async function getProfile(
  client: VolunteerServerClient,
  userId: string,
  isStaff: boolean,
  providedUser?: VerifiedProfileUser,
): Promise<VolunteerProfileDto> {
  const existing = await readOwnProfile(client, userId)
  if (existing.data) return mapProfileDto(existing.data, isStaff)

  const user = await getVerifiedProfileUser(client, userId, providedUser)
  const insertPayload = {
    id: userId,
    full_name: boundedProfileName(user),
    email: boundedProfileEmail(user),
    member_code: newMemberCode(),
  }
  const { error: insertError } = await client.from('profiles').insert(insertPayload)
  if (insertError) {
    // Another callback can create the auth profile between our read and
    // insert. Re-read only this verified user's safe projection so that the
    // losing request can complete without turning the insert into an update
    // or accepting any client-controlled role data.
    try {
      const concurrent = await readOwnProfile(client, userId)
      if (concurrent.data) return mapProfileDto(concurrent.data, isStaff)
    } catch {
      // Preserve the fail-closed response below without exposing database
      // details or treating an unavailable table as a successful signup.
    }
    throw new VolunteerDataError('Volunteer profile is temporarily unavailable.')
  }

  const created = await readOwnProfile(client, userId)
  if (!created.data) throw new VolunteerDataError('Volunteer profile is not available yet.')
  return mapProfileDto(created.data, isStaff)
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
  const modern = await client
    .from('volunteer_registrations')
    .select('id,user_id,event_id,status,hours,checked_in_at,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (!modern.error) {
    const rows = modern.data || []
    const titles = await eventTitles(client, rows.map((row) => String(row.event_id)))
    return rows.map((row) => mapRegistrationDto(row, titles.get(String(row.event_id)) || 'Volunteer event'))
  }

  // Legacy deployments expose event_volunteers instead of the versioned
  // registration table. Keep the ownership predicate server-derived and map
  // the already stored event_title; never broaden this fallback to a public
  // or staff-wide read.
  const legacy = await client
    .from('event_volunteers')
    .select('id,user_id,event_id,event_title,status,hours,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  assertNoError(legacy.error, 'Volunteer registration history is temporarily unavailable.')
  return (legacy.data || []).map((row) => mapRegistrationDto(row, String(row.event_title || 'Volunteer event')))
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
