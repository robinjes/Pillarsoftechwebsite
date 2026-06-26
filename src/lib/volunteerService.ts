import type { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export interface VolunteerProfile {
  id: string
  fullName: string
  email: string
  memberCode: string
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
  duration: number // in minutes
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
  role: 'volunteer' | 'staff' | string | null
  created_at: string | null
  total_hours?: number | null
}

type EventVolunteerRow = {
  id: string
  user_id: string
  event_id: string
  event_title: string | null
  status: 'registered' | 'attended' | 'absent' | string | null
  hours: number | null
  created_at: string | null
  checked_in_at?: string | null
  profiles?: ProfileRow | ProfileRow[] | null
}

type CheckInSessionRow = {
  id: string
  user_id: string
  event_id: string
  check_in_time: string
  check_out_time?: string | null
  hours_logged?: number | null
  profiles?: ProfileRow | ProfileRow[] | null
}

const LOCAL_PROFILE_KEY = 'pot_mock_volunteer_profile'
const LOCAL_SIGNUPS_KEY = 'pot_mock_volunteer_signups'
const LOCAL_PROFILES_LIST_KEY = 'pot_mock_all_profiles'

function generateMemberCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString()
  return `POT-${digits}`
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function getLocalStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

function setLocalStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

function getSessionStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(key)
}

function setSessionStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(key, value)
}

function removeSessionStorageItem(key: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(key)
}

function clearVolunteerSessionStorage(): void {
  if (typeof window === 'undefined') return

  const localKeysToRemove = new Set([
    LOCAL_PROFILE_KEY,
    LOCAL_SIGNUPS_KEY,
    'supabase.auth.token',
  ])

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key) continue

    if (key.startsWith('sb-') && key.includes('auth-token')) {
      localKeysToRemove.add(key)
    }
  }

  localKeysToRemove.forEach((key) => window.localStorage.removeItem(key))

  const sessionKeysToRemove: string[] = []
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index)
    if (!key) continue

    if (key.startsWith('checkin-') || key.startsWith('sb-')) {
      sessionKeysToRemove.push(key)
    }
  }

  sessionKeysToRemove.forEach((key) => window.sessionStorage.removeItem(key))
}

function redirectTo(path: string): void {
  if (typeof window === 'undefined') return
  window.location.href = path
}

function reloadPage(): void {
  if (typeof window === 'undefined') return
  window.location.reload()
}

function titleCaseEmailName(email: string): string {
  const generatedName = email.split('@')[0].replace(/[^a-zA-Z]+/g, ' ').trim()
  return generatedName.replace(/\b\w/g, (c) => c.toUpperCase()) || email.split('@')[0]
}

function getUserFullName(user: User): string {
  const fullName = user.user_metadata?.full_name
  const name = user.user_metadata?.name

  if (typeof fullName === 'string' && fullName.trim()) return fullName
  if (typeof name === 'string' && name.trim()) return name
  if (user.email) return titleCaseEmailName(user.email)

  return 'POT Volunteer'
}

function normalizeRole(role: unknown): 'volunteer' | 'staff' {
  return role === 'staff' ? 'staff' : 'volunteer'
}

function normalizeStatus(status: unknown): 'registered' | 'attended' | 'absent' {
  if (status === 'attended' || status === 'absent') return status
  return 'registered'
}

function mapProfileRow(data: ProfileRow): VolunteerProfile {
  return {
    id: data.id,
    fullName: data.full_name || 'POT Volunteer',
    email: data.email || '',
    memberCode: data.member_code || generateMemberCode(),
    role: normalizeRole(data.role),
    createdAt: data.created_at || new Date().toISOString(),
    totalHours: typeof data.total_hours === 'number' ? data.total_hours : undefined,
  }
}

function mapSignupRow(data: EventVolunteerRow): VolunteerSignup {
  return {
    id: data.id,
    userId: data.user_id,
    eventId: data.event_id,
    eventTitle: data.event_title || 'Event Check-in',
    status: normalizeStatus(data.status),
    hours: data.hours || 0,
    createdAt: data.created_at || new Date().toISOString(),
    checkedInAt: data.checked_in_at || undefined,
  }
}

function mapCheckInSessionRow(data: CheckInSessionRow): CheckInSession {
  const checkOutTime = data.check_out_time || undefined
  const durationMinutes = checkOutTime
    ? Math.max(
        0,
        Math.floor(
          (new Date(checkOutTime).getTime() - new Date(data.check_in_time).getTime()) /
            (1000 * 60)
        )
      )
    : 0

  return {
    id: data.id,
    userId: data.user_id,
    eventId: data.event_id,
    checkInTime: data.check_in_time,
    checkOutTime,
    duration: durationMinutes,
    hoursLogged:
      typeof data.hours_logged === 'number'
        ? data.hours_logged
        : Math.round((durationMinutes / 60) * 100) / 100,
  }
}

function getNestedProfile(row: { profiles?: ProfileRow | ProfileRow[] | null }): ProfileRow | null {
  if (!row.profiles) return null
  return Array.isArray(row.profiles) ? row.profiles[0] || null : row.profiles
}

function getMockProfile(): VolunteerProfile | null {
  return parseJson<VolunteerProfile | null>(getLocalStorageItem(LOCAL_PROFILE_KEY), null)
}

function setMockProfile(profile: VolunteerProfile): void {
  setLocalStorageItem(LOCAL_PROFILE_KEY, JSON.stringify(profile))
}

function getMockProfiles(): VolunteerProfile[] {
  return parseJson<VolunteerProfile[]>(getLocalStorageItem(LOCAL_PROFILES_LIST_KEY), [])
}

function setMockProfiles(profiles: VolunteerProfile[]): void {
  setLocalStorageItem(LOCAL_PROFILES_LIST_KEY, JSON.stringify(profiles))
}

function getMockSignups(): VolunteerSignup[] {
  return parseJson<VolunteerSignup[]>(getLocalStorageItem(LOCAL_SIGNUPS_KEY), [])
}

function setMockSignups(signups: VolunteerSignup[]): void {
  setLocalStorageItem(LOCAL_SIGNUPS_KEY, JSON.stringify(signups))
}

function saveMockProfileToList(profile: VolunteerProfile): void {
  const allProfiles = getMockProfiles()
  const existingIndex = allProfiles.findIndex((p) => p.id === profile.id)

  if (existingIndex >= 0) {
    allProfiles[existingIndex] = profile
  } else {
    allProfiles.push(profile)
  }

  setMockProfiles(allProfiles)
}

async function fetchOrCreateProfile(user: User): Promise<VolunteerProfile | null> {
  if (!supabase) return null

  const client = supabase

  const fetchExistingProfile = async (): Promise<VolunteerProfile | null> => {
    const { data: existing, error: fetchError } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Failed to fetch volunteer profile:', fetchError)
    }

    return existing ? mapProfileRow(existing as ProfileRow) : null
  }

  const existing = await fetchExistingProfile()
  if (existing) {
    return existing
  }

  const fullName = getUserFullName(user)
  const email = user.email || ''

  const { data: inserted, error: insertError } = await client
    .from('profiles')
    .insert({
      id: user.id,
      full_name: fullName,
      email,
      member_code: generateMemberCode(),
      role: email.includes('staff') ? 'staff' : 'volunteer',
    })
    .select()
    .single()

  if (insertError) {
    console.error('Failed to create volunteer profile:', insertError)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 350))
      const retry = await fetchExistingProfile()
      if (retry) return retry
    }

    return null
  }

  return inserted ? mapProfileRow(inserted as ProfileRow) : null
}

async function waitForCurrentSession() {
  if (!supabase) return null

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) return session
    await new Promise((resolve) => window.setTimeout(resolve, 250))
  }

  return null
}

export const volunteerService = {
  isMockMode: (): boolean => {
    return !supabase
  },

  handleAuthCallback: async (): Promise<boolean> => {
    if (!supabase || typeof window === 'undefined') return false

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (!code) return false

    const cleanAuthUrl = () => {
      url.searchParams.delete('code')
      url.searchParams.delete('state')
      window.history.replaceState({}, '', url.pathname + (url.search || ''))
    }

    const {
      data: { session: existingSession },
    } = await supabase.auth.getSession()

    if (existingSession?.user) {
      cleanAuthUrl()
      return true
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      if (error.name === 'AuthPKCECodeVerifierMissingError') {
        cleanAuthUrl()
        return false
      }

      console.error('OAuth callback failed:', error)
      return false
    }

    cleanAuthUrl()

    return true
  },

  getCurrentUser: async (): Promise<VolunteerProfile | null> => {
    if (!supabase) return getMockProfile()

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return null
      return fetchOrCreateProfile(session.user)
    } catch (error) {
      console.error('Error fetching current user:', error)
      return null
    }
  },

  signUpWithEmail: async (
    email: string,
    password: string,
    fullName: string
  ): Promise<VolunteerProfile> => {
    if (!supabase) {
      const mockProfile: VolunteerProfile = {
        id: 'mock-uid-' + Math.random().toString(36).slice(2, 11),
        fullName,
        email,
        memberCode: generateMemberCode(),
        role: email.includes('staff') ? 'staff' : 'volunteer',
        createdAt: new Date().toISOString(),
      }

      setMockProfile(mockProfile)
      saveMockProfileToList(mockProfile)
      return mockProfile
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Authentication signup failed')
    }

    const session = authData.session || (await waitForCurrentSession())
    if (!session?.user) {
      throw new Error('Account created. You can sign in now to finish your volunteer profile.')
    }

    const profile = await fetchOrCreateProfile(session.user)
    if (!profile) {
      throw new Error(
        'Account created, but the volunteer profile could not be created. Check Supabase RLS policies for the profiles table.'
      )
    }

    return profile
  },

  sendPasswordReset: async (email: string): Promise<void> => {
    if (!supabase) return
    if (typeof window === 'undefined') return

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/volunteer`,
    })

    if (error) throw error
  },

  updatePassword: async (password: string): Promise<void> => {
    if (!supabase) return

    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },

  signInWithEmail: async (email: string, password: string): Promise<VolunteerProfile> => {
    if (!supabase) {
      const allProfiles = getMockProfiles()
      let foundProfile = allProfiles.find((p) => p.email.toLowerCase() === email.toLowerCase())

      if (!foundProfile) {
        foundProfile = {
          id: 'mock-uid-' + Math.random().toString(36).slice(2, 11),
          fullName: titleCaseEmailName(email) || 'Tester User',
          email,
          memberCode: generateMemberCode(),
          role: email.includes('staff') ? 'staff' : 'volunteer',
          createdAt: new Date().toISOString(),
        }
        saveMockProfileToList(foundProfile)
      }

      setMockProfile(foundProfile)
      return foundProfile
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Login failed')
    }

    const profile = await fetchOrCreateProfile(authData.user)
    if (!profile) {
      throw new Error('Volunteer profile not found')
    }

    return profile
  },

  signInWithGoogle: async (): Promise<void> => {
    if (!supabase) {
      return new Promise((resolve) => {
        window.setTimeout(() => {
          const ssoProfile: VolunteerProfile = {
            id: 'mock-google-uid-12345',
            fullName: 'Alex Morgan (Google SSO)',
            email: 'alex.morgan@gmail.com',
            memberCode: 'POT-582931',
            role: 'volunteer',
            createdAt: new Date().toISOString(),
          }

          setMockProfile(ssoProfile)
          saveMockProfileToList(ssoProfile)
          reloadPage()
          resolve()
        }, 1000)
      })
    }

    if (typeof window === 'undefined') return

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/volunteer`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) throw error
  },

  signOut: async (): Promise<void> => {
    if (!supabase) {
      clearVolunteerSessionStorage()
      redirectTo('/volunteer')
      return
    }

    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      console.error('Supabase sign-out failed:', error)
    }

    clearVolunteerSessionStorage()
    redirectTo('/volunteer')
  },

  getAllProfiles: async (): Promise<VolunteerProfile[]> => {
    if (!supabase) {
      return getMockProfiles().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error || !data) {
        if (error) console.error('Failed to fetch profiles:', error)
        return []
      }

      return (data as ProfileRow[]).map(mapProfileRow)
    } catch (error) {
      console.error('Error fetching all profiles:', error)
      return []
    }
  },

  updateUserRole: async (
    userId: string,
    newRole: 'volunteer' | 'staff'
  ): Promise<VolunteerProfile | null> => {
    if (!supabase) {
      const currentProfile = getMockProfile()

      if (!currentProfile || currentProfile.role !== 'staff') {
        throw new Error('Only staff can update user roles.')
      }

      const updatedProfiles = getMockProfiles().map((profile) =>
        profile.id === userId ? { ...profile, role: newRole } : profile
      )

      setMockProfiles(updatedProfiles)

      const updatedProfile = updatedProfiles.find((profile) => profile.id === userId) || null

      if (updatedProfile && currentProfile.id === userId) {
        setMockProfile(updatedProfile)
      }

      return updatedProfile
    }

    try {
      const currentUser = await volunteerService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'staff') {
        throw new Error('Only staff can update user roles.')
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single()

      if (error || !data) {
        console.error('Failed to update user role:', error)
        return null
      }

      return mapProfileRow(data as ProfileRow)
    } catch (error) {
      console.error('Error updating user role:', error)
      return null
    }
  },

  // Update volunteer total hours manually
  updateVolunteerHours: async (
    userId: string,
    hours: number,
    reason?: string
  ): Promise<VolunteerProfile | null> => {
    if (!supabase) {
      const currentProfile = getMockProfile()

      if (!currentProfile || currentProfile.role !== 'staff') {
        throw new Error('Only staff can update volunteer hours.')
      }

      const updatedProfiles = getMockProfiles().map((profile) =>
        profile.id === userId
          ? {
              ...profile,
              totalHours: hours,
            }
          : profile
      )

      setMockProfiles(updatedProfiles)

      const updatedProfile = updatedProfiles.find((profile) => profile.id === userId) || null

      if (updatedProfile && currentProfile.id === userId) {
        setMockProfile(updatedProfile)
      }

      return updatedProfile
    }

    const client = supabase

    try {
      const currentUser = await volunteerService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'staff') {
        throw new Error('Only staff can update volunteer hours.')
      }

      const { data, error } = await client
        .from('profiles')
        .update({ total_hours: hours })
        .eq('id', userId)
        .select()
        .single()

      if (error || !data) {
        console.error('Failed to update volunteer hours:', error)
        return null
      }

      // Optional audit log. This will not block the hour update if the table does not exist.
      const { error: auditError } = await client.from('volunteer_hour_adjustments').insert({
        user_id: userId,
        adjusted_by: currentUser.id,
        hours,
        reason: reason || 'Manual adjustment by admin',
      })

      if (auditError) {
        console.error('Failed to write volunteer hour adjustment audit log:', auditError)
      }

      return mapProfileRow(data as ProfileRow)
    } catch (error) {
      console.error('Error updating volunteer hours:', error)
      return null
    }
  },

  getActiveCheckInSessions: async (): Promise<ActiveCheckInSession[]> => {
    if (!supabase) {
      if (typeof window === 'undefined') return []

      const profilesById = new Map(getMockProfiles().map((profile) => [profile.id, profile]))
      const sessions: ActiveCheckInSession[] = []

      for (let index = 0; index < window.sessionStorage.length; index += 1) {
        const key = window.sessionStorage.key(index)
        if (!key?.startsWith('checkin-')) continue

        const session = parseJson<CheckInSession | null>(getSessionStorageItem(key), null)
        if (!session || session.checkOutTime) continue

        const profile = profilesById.get(session.userId)
        if (!profile) continue

        const durationMinutes = Math.max(
          0,
          Math.floor((Date.now() - new Date(session.checkInTime).getTime()) / (1000 * 60))
        )

        sessions.push({
          profile,
          eventId: session.eventId,
          checkInTime: session.checkInTime,
          sessionId: session.id,
          hoursLogged: Math.round((durationMinutes / 60) * 100) / 100,
        })
      }

      return sessions.sort(
        (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
      )
    }

    const { data, error } = await supabase
      .from('check_in_sessions')
      .select('id, user_id, event_id, check_in_time, hours_logged, profiles(*)')
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })

    if (error || !data) {
      if (error) console.error('Failed to fetch active check-in sessions:', error)
      return []
    }

    return (data as CheckInSessionRow[])
      .map((session) => {
        const profileRow = Array.isArray(session.profiles)
          ? session.profiles[0]
          : session.profiles

        if (!profileRow) return null

        const durationMinutes = Math.max(
          0,
          Math.floor((Date.now() - new Date(session.check_in_time).getTime()) / (1000 * 60))
        )

        return {
          profile: mapProfileRow(profileRow),
          eventId: session.event_id,
          checkInTime: session.check_in_time,
          sessionId: session.id,
          hoursLogged:
            typeof session.hours_logged === 'number'
              ? session.hours_logged
              : Math.round((durationMinutes / 60) * 100) / 100,
        }
      })
      .filter((session): session is ActiveCheckInSession => session !== null)
  },

  registerForEvent: async (
    userId: string,
    eventId: string,
    eventTitle: string
  ): Promise<VolunteerSignup> => {
    if (!supabase) {
      const signups = getMockSignups()
      const existing = signups.find((s) => s.userId === userId && s.eventId === eventId)
      if (existing) return existing

      const newSignup: VolunteerSignup = {
        id: 'mock-signup-' + Math.random().toString(36).slice(2, 11),
        userId,
        eventId,
        eventTitle,
        status: 'registered',
        hours: 0,
        createdAt: new Date().toISOString(),
      }

      signups.push(newSignup)
      setMockSignups(signups)
      return newSignup
    }

    const { data, error } = await supabase
      .from('event_volunteers')
      .insert({
        user_id: userId,
        event_id: eventId,
        event_title: eventTitle,
        status: 'registered',
        hours: 0,
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to register for event')
    }

    return mapSignupRow(data as EventVolunteerRow)
  },

  withdrawFromEvent: async (userId: string, eventId: string): Promise<void> => {
    if (!supabase) {
      const updatedSignups = getMockSignups().filter(
        (signup) =>
          !(
            signup.userId === userId &&
            signup.eventId === eventId &&
            signup.status === 'registered'
          )
      )
      setMockSignups(updatedSignups)
      return
    }

    const { error } = await supabase
      .from('event_volunteers')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('status', 'registered')

    if (error) {
      throw new Error(error.message || 'Failed to withdraw from event')
    }
  },

  getMySignups: async (userId: string): Promise<VolunteerSignup[]> => {
    if (!supabase) {
      return getMockSignups().filter((s) => s.userId === userId)
    }

    try {
      const { data, error } = await supabase
        .from('event_volunteers')
        .select('*')
        .eq('user_id', userId)

      if (error || !data) {
        if (error) console.error('Failed to fetch signups:', error)
        return []
      }

      return (data as EventVolunteerRow[]).map(mapSignupRow)
    } catch (error) {
      console.error('Error fetching my signups:', error)
      return []
    }
  },

  getEventRoster: async (eventId: string): Promise<EventRosterEntry[]> => {
    if (!supabase) {
      const profilesById = new Map(getMockProfiles().map((profile) => [profile.id, profile]))
      return getMockSignups()
        .filter((signup) => signup.eventId === eventId)
        .map((signup) => ({
          signup,
          profile: profilesById.get(signup.userId) || null,
        }))
    }

    try {
      const { data, error } = await supabase
        .from('event_volunteers')
        .select('*, profiles(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (error || !data) {
        if (error) console.error('Failed to fetch event roster:', error)
        return []
      }

      return (data as EventVolunteerRow[]).map((row) => ({
        signup: mapSignupRow(row),
        profile: getNestedProfile(row) ? mapProfileRow(getNestedProfile(row) as ProfileRow) : null,
      }))
    } catch (error) {
      console.error('Error fetching event roster:', error)
      return []
    }
  },

  searchProfiles: async (query: string): Promise<VolunteerProfile[]> => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    const matchesQuery = (profile: VolunteerProfile) =>
      profile.fullName.toLowerCase().includes(normalizedQuery) ||
      profile.email.toLowerCase().includes(normalizedQuery) ||
      profile.memberCode.toLowerCase().includes(normalizedQuery)

    if (!supabase) {
      return getMockProfiles().filter(matchesQuery).slice(0, 8)
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(
          `full_name.ilike.%${normalizedQuery}%,email.ilike.%${normalizedQuery}%,member_code.ilike.%${normalizedQuery}%`
        )
        .limit(8)

      if (error || !data) {
        if (error) console.error('Failed to search profiles:', error)
        return []
      }

      return (data as ProfileRow[]).map(mapProfileRow)
    } catch (error) {
      console.error('Error searching profiles:', error)
      return []
    }
  },

  getCurrentCheckInStatus: async (userId: string): Promise<CheckInSession | null> => {
    if (!supabase) {
      const session = parseJson<CheckInSession | null>(
        getSessionStorageItem(`checkin-${userId}`),
        null
      )

      return session && !session.checkOutTime ? session : null
    }

    try {
      const { data, error } = await supabase
        .from('check_in_sessions')
        .select('*')
        .eq('user_id', userId)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        if (error) console.error('Failed to fetch current check-in status:', error)
        return null
      }

      return mapCheckInSessionRow(data as CheckInSessionRow)
    } catch (error) {
      console.error('Error fetching current check-in status:', error)
      return null
    }
  },

  startCheckIn: async (userId: string, eventId: string): Promise<CheckInSession> => {
    if (!supabase) {
      const sessionKey = `checkin-${userId}`
      const activeSession = parseJson<CheckInSession | null>(
        getSessionStorageItem(sessionKey),
        null
      )

      if (activeSession && !activeSession.checkOutTime) return activeSession

      const newSession: CheckInSession = {
        id: 'session-' + Math.random().toString(36).slice(2, 11),
        userId,
        eventId,
        checkInTime: new Date().toISOString(),
        duration: 0,
        hoursLogged: 0,
      }

      setSessionStorageItem(sessionKey, JSON.stringify(newSession))
      return newSession
    }

    const existing = await volunteerService.getCurrentCheckInStatus(userId)
    if (existing) return existing

    const { data, error } = await supabase
      .from('check_in_sessions')
      .insert({
        user_id: userId,
        event_id: eventId,
        check_in_time: new Date().toISOString(),
        hours_logged: 0,
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to start check-in session')
    }

    return mapCheckInSessionRow(data as CheckInSessionRow)
  },

  checkOut: async (
    sessionId: string,
    userId: string
  ): Promise<{ session: CheckInSession; hoursAdded: number }> => {
    if (!supabase) {
      const sessionKey = `checkin-${userId}`
      const activeSession = parseJson<CheckInSession | null>(
        getSessionStorageItem(sessionKey),
        null
      )

      if (!activeSession || activeSession.id !== sessionId) {
        throw new Error('No active check-in session found.')
      }

      const checkOutTime = new Date().toISOString()
      const durationMinutes = Math.max(
        0,
        Math.floor(
          (new Date(checkOutTime).getTime() - new Date(activeSession.checkInTime).getTime()) /
            (1000 * 60)
        )
      )
      const hoursAdded = Math.round((durationMinutes / 60) * 100) / 100
      const completedSession: CheckInSession = {
        ...activeSession,
        checkOutTime,
        duration: durationMinutes,
        hoursLogged: hoursAdded,
      }

      removeSessionStorageItem(sessionKey)

      const profiles = getMockProfiles().map((profile) =>
        profile.id === userId
          ? { ...profile, totalHours: (profile.totalHours || 0) + hoursAdded }
          : profile
      )
      setMockProfiles(profiles)

      const currentProfile = getMockProfile()
      const updatedCurrentProfile = profiles.find((profile) => profile.id === currentProfile?.id)
      if (updatedCurrentProfile) setMockProfile(updatedCurrentProfile)

      return { session: completedSession, hoursAdded }
    }

    const { data: currentSession, error: fetchError } = await supabase
      .from('check_in_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .is('check_out_time', null)
      .single()

    if (fetchError || !currentSession) {
      throw new Error(fetchError?.message || 'No active check-in session found.')
    }

    const sessionRow = currentSession as CheckInSessionRow
    const checkOutTime = new Date().toISOString()
    const durationMinutes = Math.max(
      0,
      Math.floor(
        (new Date(checkOutTime).getTime() - new Date(sessionRow.check_in_time).getTime()) /
          (1000 * 60)
      )
    )
    const hoursAdded = Math.round((durationMinutes / 60) * 100) / 100

    const { data: updatedSession, error: updateError } = await supabase
      .from('check_in_sessions')
      .update({
        check_out_time: checkOutTime,
        hours_logged: hoursAdded,
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError || !updatedSession) {
      throw new Error(updateError?.message || 'Failed to check out.')
    }

    return {
      session: mapCheckInSessionRow(updatedSession as CheckInSessionRow),
      hoursAdded,
    }
  },

  checkInVolunteer: async (
    memberCode: string,
    eventId: string
  ): Promise<{
    profile: VolunteerProfile
    signup: VolunteerSignup
    action: 'checkedIn' | 'checkedOut'
    hoursLogged: number
    checkInTime: string
    checkOutTime?: string
  }> => {
    if (!supabase) {
      const profile = getMockProfiles().find((p) => p.memberCode === memberCode)

      if (!profile) {
        throw new Error('No volunteer profile matches member code ' + memberCode)
      }

      const signups = getMockSignups()
      let signup = signups.find((s) => s.userId === profile.id && s.eventId === eventId)
      const sessionKey = `checkin-${profile.id}`
      const activeSession = parseJson<CheckInSession | null>(getSessionStorageItem(sessionKey), null)

      if (activeSession && !activeSession.checkOutTime) {
        if (activeSession.eventId !== eventId) {
          throw new Error('Volunteer is already checked in for another event.')
        }

        const checkOutTime = new Date()
        const checkInTime = new Date(activeSession.checkInTime)
        const durationMinutes = Math.floor(
          (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60)
        )
        const hours = Math.round((durationMinutes / 60) * 100) / 100

        removeSessionStorageItem(sessionKey)

        if (!signup) {
          signup = {
            id: 'mock-signup-' + Math.random().toString(36).slice(2, 11),
            userId: profile.id,
            eventId,
            eventTitle: 'Event Check-in',
            status: 'attended',
            hours,
            createdAt: new Date().toISOString(),
            checkedInAt: activeSession.checkInTime,
          }
          signups.push(signup)
        } else {
          signup.status = 'attended'
          signup.hours = hours
          signup.checkedInAt = activeSession.checkInTime
        }

        setMockSignups(signups)

        const updatedProfiles = getMockProfiles().map((mockProfile) =>
          mockProfile.id === profile.id
            ? { ...mockProfile, totalHours: (mockProfile.totalHours || 0) + hours }
            : mockProfile
        )
        setMockProfiles(updatedProfiles)

        return {
          profile,
          signup,
          action: 'checkedOut',
          hoursLogged: hours,
          checkInTime: activeSession.checkInTime,
          checkOutTime: checkOutTime.toISOString(),
        }
      }

      if (!signup) {
        signup = {
          id: 'mock-signup-' + Math.random().toString(36).slice(2, 11),
          userId: profile.id,
          eventId,
          eventTitle: 'Event Check-in',
          status: 'registered',
          hours: 0,
          createdAt: new Date().toISOString(),
        }
        signups.push(signup)
      }

      const newSession: CheckInSession = {
        id: 'session-' + Math.random().toString(36).slice(2, 11),
        userId: profile.id,
        eventId,
        checkInTime: new Date().toISOString(),
        duration: 0,
        hoursLogged: 0,
      }

      setSessionStorageItem(sessionKey, JSON.stringify(newSession))
      setMockSignups(signups)

      return {
        profile,
        signup,
        action: 'checkedIn',
        hoursLogged: 0,
        checkInTime: newSession.checkInTime,
      }
    }

    const client = supabase

    const { data: profileData, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('member_code', memberCode)
      .single()

    if (profileError || !profileData) {
      throw new Error('Volunteer profile not found for code ' + memberCode)
    }

    const profileRow = profileData as ProfileRow
    const mappedProfile = mapProfileRow(profileRow)

    const { data: activeSession, error: activeSessionError } = await client
      .from('check_in_sessions')
      .select('*')
      .eq('user_id', profileRow.id)
      .eq('event_id', eventId)
      .is('check_out_time', null)
      .maybeSingle()

    if (activeSessionError) {
      console.error('Error checking active session:', activeSessionError)
    }

    const { data: signupData, error: signupFetchError } = await client
      .from('event_volunteers')
      .select('*')
      .eq('user_id', profileRow.id)
      .eq('event_id', eventId)
      .maybeSingle()

    if (signupFetchError) {
      console.error('Error checking event registration:', signupFetchError)
    }

    const ensureSignup = async (): Promise<EventVolunteerRow> => {
      if (signupData) return signupData as EventVolunteerRow

      const { data: newSignup, error: insertError } = await client
        .from('event_volunteers')
        .insert({
          user_id: profileRow.id,
          event_id: eventId,
          event_title: 'Event Check-in',
          status: 'registered',
          hours: 0,
          checked_in_at: null,
        })
        .select()
        .single()

      if (insertError || !newSignup) {
        throw new Error(insertError?.message || 'Failed to create event registration for volunteer')
      }

      return newSignup as EventVolunteerRow
    }

    if (!activeSession) {
      const signupRow = await ensureSignup()

      const { data: newSession, error: insertSessionError } = await client
        .from('check_in_sessions')
        .insert({
          user_id: profileRow.id,
          event_id: eventId,
          check_in_time: new Date().toISOString(),
          hours_logged: 0,
        })
        .select()
        .single()

      if (insertSessionError || !newSession) {
        throw new Error(insertSessionError?.message || 'Failed to start volunteer check-in session')
      }

      const sessionRow = newSession as CheckInSessionRow

      const { error: attendanceInsertError } = await client.from('attendance_logs').insert({
        volunteer_id: profileRow.id,
        event_id: eventId,
        checked_in_at: sessionRow.check_in_time,
      })

      if (attendanceInsertError) {
        console.error('Failed to write attendance log:', attendanceInsertError)
      }

      return {
        profile: mappedProfile,
        signup: {
          ...mapSignupRow(signupRow),
          checkedInAt: signupRow.checked_in_at || sessionRow.check_in_time,
        },
        action: 'checkedIn',
        hoursLogged: 0,
        checkInTime: sessionRow.check_in_time,
      }
    }

    const activeSessionRow = activeSession as CheckInSessionRow

    if (activeSessionRow.event_id !== eventId) {
      throw new Error('Volunteer is already checked in for another event.')
    }

    const checkOutTime = new Date().toISOString()
    const checkInTime = new Date(activeSessionRow.check_in_time)
    const durationMinutes = Math.max(
      0,
      Math.floor((new Date(checkOutTime).getTime() - checkInTime.getTime()) / (1000 * 60))
    )
    const hours = Math.round((durationMinutes / 60) * 100) / 100

    const { data: updatedSession, error: updateSessionError } = await client
      .from('check_in_sessions')
      .update({
        check_out_time: checkOutTime,
        hours_logged: hours,
      })
      .eq('id', activeSessionRow.id)
      .select()
      .single()

    if (updateSessionError || !updatedSession) {
      throw new Error(updateSessionError?.message || 'Failed to complete volunteer check-out')
    }

    const { error: attendanceUpdateError } = await client
      .from('attendance_logs')
      .update({ checked_out_at: checkOutTime })
      .eq('volunteer_id', profileRow.id)
      .eq('event_id', eventId)
      .is('checked_out_at', null)

    if (attendanceUpdateError) {
      console.error('Failed to update attendance log:', attendanceUpdateError)
    }

    let finalSignup: EventVolunteerRow | null = signupData as EventVolunteerRow | null

    if (finalSignup) {
      const { data: updatedSignup, error: updateSignupError } = await client
        .from('event_volunteers')
        .update({
          status: 'attended',
          hours,
          checked_in_at: activeSessionRow.check_in_time,
        })
        .eq('id', finalSignup.id)
        .select()
        .single()

      if (updateSignupError || !updatedSignup) {
        console.error('Failed to update signup:', updateSignupError)
      } else {
        finalSignup = updatedSignup as EventVolunteerRow
      }
    } else {
      const { data: newSignup, error: insertSignupError } = await client
        .from('event_volunteers')
        .insert({
          user_id: profileRow.id,
          event_id: eventId,
          event_title: 'Event Check-in',
          status: 'attended',
          hours,
          checked_in_at: activeSessionRow.check_in_time,
        })
        .select()
        .single()

      if (insertSignupError || !newSignup) {
        throw new Error(insertSignupError?.message || 'Failed to create attended signup record')
      }

      finalSignup = newSignup as EventVolunteerRow
    }

    const { data: currentTotalProfile } = await client
      .from('profiles')
      .select('total_hours')
      .eq('id', profileRow.id)
      .single()

    const currentTotalHours =
      typeof currentTotalProfile?.total_hours === 'number' ? currentTotalProfile.total_hours : 0

    const { error: totalHoursError } = await client
      .from('profiles')
      .update({ total_hours: currentTotalHours + hours })
      .eq('id', profileRow.id)

    if (totalHoursError) {
      console.error('Failed to update volunteer total hours:', totalHoursError)
    }

    return {
      profile: mappedProfile,
      signup: {
        ...mapSignupRow(finalSignup),
        checkedInAt: finalSignup.checked_in_at || activeSessionRow.check_in_time,
      },
      action: 'checkedOut',
      hoursLogged: hours,
      checkInTime: activeSessionRow.check_in_time,
      checkOutTime,
    }
  },
}
