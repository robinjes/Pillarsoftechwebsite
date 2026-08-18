import { supabase } from '@/lib/supabase/client'

export interface VolunteerProfile {
  id: string
  fullName: string
  email: string
  memberCode: string
  /** Display data returned by a server-authorized endpoint; never a client authorization input. */
  role: 'volunteer' | 'staff'
  createdAt: string
  totalHours?: number
}

export interface VolunteerSignup {
  id: string
  userId: string
  eventId: string
  eventTitle: string
  status: 'registered' | 'attended' | 'absent'
  hours: number
  createdAt: string
  checkedInAt?: string
}

export interface CheckInSession {
  id: string
  userId: string
  eventId: string
  checkInTime: string
  checkOutTime?: string
  duration: number
  hoursLogged: number
}

export interface ActiveCheckInSession {
  profile: VolunteerProfile
  eventId: string
  checkInTime: string
  sessionId: string
  hoursLogged: number
}

export interface EventRosterEntry {
  signup: VolunteerSignup
  profile: VolunteerProfile | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  member_code: string | null
  created_at: string | null
  total_hours?: number | null
  role?: 'volunteer' | 'staff' | null
}

type EventRow = {
  title?: string | null
}

type RegistrationRow = {
  id: string
  user_id: string
  event_id: string
  status: 'registered' | 'attended' | 'absent' | string | null
  hours: number | null
  created_at: string | null
  checked_in_at?: string | null
  events?: EventRow | EventRow[] | null
  profiles?: ProfileRow | ProfileRow[] | null
}

type AttendanceSessionRow = {
  id: string
  user_id: string
  event_id: string
  check_in_at: string
  check_out_at?: string | null
  hours_logged?: number | null
  profiles?: ProfileRow | ProfileRow[] | null
}

type StaffAttendanceResult = {
  profile?: ProfileRow
  registration?: RegistrationRow
  action?: 'checkedIn' | 'checkedOut'
  hours_logged?: number | null
  check_in_at?: string | null
  check_out_at?: string | null
}

function unavailable(message = 'Supabase is not configured for this operation.'): Error {
  return new Error(message)
}

function requireClient() {
  if (!supabase) throw unavailable()
  return supabase
}

function normalizeStatus(status: unknown): 'registered' | 'attended' | 'absent' {
  if (status === 'attended' || status === 'absent') return status
  return 'registered'
}

function nested<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function mapProfileRow(data: ProfileRow): VolunteerProfile {
  return {
    id: data.id,
    fullName: data.full_name || 'POT Volunteer',
    email: data.email || '',
    memberCode: data.member_code || 'POT-UNAVAILABLE',
    // This field is populated only by /api/auth/me or /api/staff/profiles.
    // A browser query cannot promote a user to staff.
    role: data.role === 'staff' ? 'staff' : 'volunteer',
    createdAt: data.created_at || new Date(0).toISOString(),
    totalHours: typeof data.total_hours === 'number' ? data.total_hours : undefined,
  }
}

function mapSignupRow(data: RegistrationRow): VolunteerSignup {
  const event = nested(data.events)
  return {
    id: data.id,
    userId: data.user_id,
    eventId: data.event_id,
    eventTitle: event?.title || 'Event volunteer registration',
    status: normalizeStatus(data.status),
    hours: typeof data.hours === 'number' ? data.hours : 0,
    createdAt: data.created_at || new Date(0).toISOString(),
    checkedInAt: data.checked_in_at || undefined,
  }
}

function mapSessionRow(data: AttendanceSessionRow): CheckInSession {
  const checkOutTime = data.check_out_at || undefined
  const duration = checkOutTime
    ? Math.max(
        0,
        Math.floor(
          (new Date(checkOutTime).getTime() - new Date(data.check_in_at).getTime()) / 60000
        )
      )
    : 0

  return {
    id: data.id,
    userId: data.user_id,
    eventId: data.event_id,
    checkInTime: data.check_in_at,
    checkOutTime,
    duration,
    hoursLogged:
      typeof data.hours_logged === 'number'
        ? data.hours_logged
        : Math.round((duration / 60) * 100) / 100,
  }
}

function mapAttendanceResult(result: StaffAttendanceResult): {
  profile: VolunteerProfile
  signup: VolunteerSignup
  action: 'checkedIn' | 'checkedOut'
  hoursLogged: number
  checkInTime: string
  checkOutTime?: string
} {
  if (!result.profile || !result.registration || !result.action || !result.check_in_at) {
    throw new Error('The attendance service returned an incomplete result.')
  }

  return {
    profile: mapProfileRow({ ...result.profile, role: 'volunteer' }),
    signup: mapSignupRow(result.registration),
    action: result.action,
    hoursLogged: typeof result.hours_logged === 'number' ? result.hours_logged : 0,
    checkInTime: result.check_in_at,
    checkOutTime: result.check_out_at || undefined,
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(path, { ...init, cache: 'no-store' })
  if (!response.ok) return null
  return (await response.json()) as T
}

export const volunteerService = {
  isSupabaseConfigured: (): boolean => Boolean(supabase),

  getCurrentUser: async (): Promise<VolunteerProfile | null> => {
    const data = await fetchJson<{ profile?: ProfileRow }>('/api/auth/me')
    return data?.profile ? mapProfileRow(data.profile) : null
  },

  signInWithGoogle: async (next = '/volunteer'): Promise<void> => {
    const client = requireClient()
    if (typeof window === 'undefined') return

    const callback = new URL('/auth/callback', window.location.origin)
    callback.searchParams.set('next', next)
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callback.toString(),
        queryParams: { prompt: 'select_account' },
      },
    })

    if (error) throw error
  },

  signOut: async (): Promise<void> => {
    await fetch('/auth/signout', { method: 'POST', cache: 'no-store' })
    if (supabase) await supabase.auth.signOut({ scope: 'local' })
    if (typeof window !== 'undefined') window.location.assign('/volunteer')
  },

  getAllProfiles: async (): Promise<VolunteerProfile[]> => {
    const data = await fetchJson<{ profiles?: ProfileRow[] }>('/api/staff/profiles')
    return (data?.profiles || []).map(mapProfileRow)
  },

  registerForEvent: async (eventId: string): Promise<VolunteerSignup> => {
    const client = requireClient()
    const { data, error } = await client.rpc('register_for_event', { p_event_id: eventId })
    if (error || !data) throw new Error(error?.message || 'Failed to register for event.')
    return mapSignupRow((Array.isArray(data) ? data[0] : data) as RegistrationRow)
  },

  withdrawFromEvent: async (eventId: string): Promise<void> => {
    const client = requireClient()
    const { error } = await client.rpc('cancel_event_registration', { p_event_id: eventId })
    if (error) throw new Error(error.message || 'Failed to cancel registration.')
  },

  getMySignups: async (): Promise<VolunteerSignup[]> => {
    const client = requireClient()
    const { data, error } = await client
      .from('volunteer_registrations')
      .select('*, events(title)')
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return (data as RegistrationRow[]).map(mapSignupRow)
  },

  getEventRoster: async (eventId: string): Promise<EventRosterEntry[]> => {
    const client = requireClient()
    const { data, error } = await client
      .from('volunteer_registrations')
      .select('*, events(title), profiles(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (error || !data) return []
    return (data as RegistrationRow[]).map((row) => ({
      signup: mapSignupRow(row),
      profile: nested(row.profiles) ? mapProfileRow(nested(row.profiles) as ProfileRow) : null,
    }))
  },

  searchProfiles: async (query: string): Promise<VolunteerProfile[]> => {
    const normalized = query.trim()
    if (!normalized) return []
    const data = await fetchJson<{ profiles?: ProfileRow[] }>(
      `/api/staff/profiles?q=${encodeURIComponent(normalized)}`
    )
    return (data?.profiles || []).slice(0, 8).map(mapProfileRow)
  },

  getActiveCheckInSessions: async (): Promise<ActiveCheckInSession[]> => {
    const client = requireClient()
    const { data, error } = await client
      .from('attendance_sessions')
      .select('id, user_id, event_id, check_in_at, hours_logged, profiles(*)')
      .is('check_out_at', null)
      .order('check_in_at', { ascending: false })

    if (error || !data) return []
    return (data as AttendanceSessionRow[])
      .map((session) => {
        const profile = nested(session.profiles)
        if (!profile) return null
        return {
          profile: mapProfileRow(profile),
          eventId: session.event_id,
          checkInTime: session.check_in_at,
          sessionId: session.id,
          hoursLogged: typeof session.hours_logged === 'number' ? session.hours_logged : 0,
        }
      })
      .filter((session): session is ActiveCheckInSession => session !== null)
  },

  getCurrentCheckInStatus: async (): Promise<CheckInSession | null> => {
    const client = requireClient()
    const { data, error } = await client
      .from('attendance_sessions')
      .select('*')
      .is('check_out_at', null)
      .order('check_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    return mapSessionRow(data as AttendanceSessionRow)
  },

  // Attendance mutations are intentionally staff-RPC-only. Ordinary
  // volunteers cannot create or alter attendance rows from this client.
  startCheckIn: async (): Promise<CheckInSession> => {
    throw unavailable('Attendance check-in is managed by authorized staff.')
  },

  checkOut: async (): Promise<{ session: CheckInSession; hoursAdded: number }> => {
    throw unavailable('Attendance check-out is managed by authorized staff.')
  },

  updateVolunteerHours: async (
    userId: string,
    hours: number,
    reason?: string
  ): Promise<VolunteerProfile | null> => {
    const client = requireClient()
    const { data, error } = await client.rpc('staff_adjust_volunteer_hours', {
      p_user_id: userId,
      p_hours: hours,
      p_reason: reason || null,
    })
    if (error || !data) throw new Error(error?.message || 'Failed to record hour adjustment.')
    return mapProfileRow(data as ProfileRow)
  },

  checkInVolunteer: async (memberCode: string, eventId: string) => {
    const client = requireClient()
    const { data, error } = await client.rpc('staff_check_in_or_out', {
      p_member_code: memberCode,
      p_event_id: eventId,
    })
    if (error || !data) throw new Error(error?.message || 'Attendance action failed.')
    return mapAttendanceResult(data as StaffAttendanceResult)
  },

  onAuthStateChange: (callback: () => void) => {
    if (!supabase) return () => undefined
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => callback())
    return () => subscription.unsubscribe()
  },
}
