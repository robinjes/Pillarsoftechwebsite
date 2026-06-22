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

// Key for mock local storage
const LOCAL_PROFILE_KEY = 'pot_mock_volunteer_profile'
const LOCAL_SIGNUPS_KEY = 'pot_mock_volunteer_signups'
const LOCAL_PROFILES_LIST_KEY = 'pot_mock_all_profiles'

// Helper to generate a unique member code: POT-XXXXXX where X is a digit
function generateMemberCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString()
  return `POT-${digits}`
}

function mapProfileRow(data: {
  id: string
  full_name: string
  email: string
  member_code: string
  role: 'volunteer' | 'staff'
  created_at: string
}): VolunteerProfile {
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    memberCode: data.member_code,
    role: data.role,
    createdAt: data.created_at,
  }
}

async function fetchOrCreateProfile(user: User): Promise<VolunteerProfile | null> {
  if (!supabase) return null

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) {
    console.log('fetchOrCreateProfile: found existing profile', existing)
    return mapProfileRow(existing)
  }

  console.log('fetchOrCreateProfile: creating new profile for user', user.id, user.email)

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split('@')[0].replace(/[^a-zA-Z]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'POT Volunteer')

  const insertPayload = {
    id: user.id,
    full_name: fullName,
    email: user.email!,
    member_code: generateMemberCode(),
    role: user.email?.includes('staff') ? 'staff' : 'volunteer',
  }
  console.log('fetchOrCreateProfile: inserting payload', insertPayload)

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert(insertPayload)
    .select()
    .single()

  if (inserted) {
    console.log('fetchOrCreateProfile: profile created successfully', inserted)
    return mapProfileRow(inserted)
  }

  if (insertError) {
    console.error('fetchOrCreateProfile: insert error details:', insertError.message, insertError.code, insertError.details, JSON.stringify(insertError))
    const { data: retry } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (retry) {
      console.log('fetchOrCreateProfile: retry found profile', retry)
      return mapProfileRow(retry)
    }
    console.error('Failed to create volunteer profile:', insertError)
  }

  return null
}

export const volunteerService = {
  // Check if we are running in mock mode (no Supabase config)
  isMockMode: (): boolean => {
    return !supabase
  },

  // Exchange OAuth PKCE code after Google redirect (must run before getCurrentUser)
  handleAuthCallback: async (): Promise<boolean> => {
    if (!supabase || typeof window === 'undefined') {
      console.log('handleAuthCallback: no supabase or window')
      return false
    }

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    console.log('handleAuthCallback: code=', code)
    if (!code) {
      console.log('handleAuthCallback: no code found')
      return false
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('handleAuthCallback: exchange result, error=', error)

    if (error) {
      console.error('OAuth callback failed:', error)
      return false
    }

    const { data: { session } } = await supabase.auth.getSession()
    console.log('handleAuthCallback: after exchange, session=', session)

    url.searchParams.delete('code')
    url.searchParams.delete('state')
    const cleanPath = url.pathname + (url.search || '')
    window.history.replaceState({}, '', cleanPath)

    console.log('handleAuthCallback: success')
    return true
  },

  // Get current logged-in profile
  getCurrentUser: async (): Promise<VolunteerProfile | null> => {
    if (!supabase) {
      // Mock Mode: read from localStorage
      const profileJson = localStorage.getItem(LOCAL_PROFILE_KEY)
      return profileJson ? JSON.parse(profileJson) : null
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return null

      return fetchOrCreateProfile(user)
    } catch (e) {
      console.error('Error fetching current user:', e)
      return null
    }
  },

  // Sign up with Email/Password
  signUpWithEmail: async (email: string, password: string, fullName: string): Promise<VolunteerProfile> => {
    if (!supabase) {
      // Mock Mode: Register user in localStorage
      const mockProfile: VolunteerProfile = {
        id: 'mock-uid-' + Math.random().toString(36).substr(2, 9),
        fullName,
        email,
        memberCode: generateMemberCode(),
        role: email.includes('staff') ? 'staff' : 'volunteer',
        createdAt: new Date().toISOString()
      }
      
      // Save current logged in user
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(mockProfile))

      // Save to global list of mock profiles (for staff checkin lookup)
      const allProfilesJson = localStorage.getItem(LOCAL_PROFILES_LIST_KEY)
      const allProfiles: VolunteerProfile[] = allProfilesJson ? JSON.parse(allProfilesJson) : []
      allProfiles.push(mockProfile)
      localStorage.setItem(LOCAL_PROFILES_LIST_KEY, JSON.stringify(allProfiles))

      return mockProfile
    }

    // Supabase Mode
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Authentication signup failed')
    }

    const newProfile = {
      id: authData.user.id,
      full_name: fullName,
      email: email,
      member_code: generateMemberCode(),
      role: email.includes('staff') ? 'staff' : 'volunteer'
    }

    // Add timeout to prevent hanging - 8 second limit for profile creation
    let data: any = null
    let dbError: any = null
    let timedOut = false

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        timedOut = true
      }, 8000)

      const result = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()

      clearTimeout(timeoutId)
      data = result.data
      dbError = result.error
    } catch (err: any) {
      dbError = err
    }

    // If profile creation timed out or had permission error, return temporary profile
    // User can log in with the dashboard, and profile will sync after email verification
    if (timedOut || dbError?.code === 'PGRST301') {
      console.log('Profile creation timeout or permission denied, proceeding with temporary profile')
      return {
        id: authData.user.id,
        fullName,
        email,
        memberCode: generateMemberCode(),
        role: email.includes('staff') ? 'staff' : 'volunteer',
        createdAt: new Date().toISOString()
      }
    }

    if (dbError || !data) {
      // If auth succeeded but profile creation failed (likely RLS/verification issue),
      // show user-friendly message about email verification
      throw new Error('Please check your email for a verification link. After that, this page will automatically log in.')
    }

    return mapProfileRow(data)
  },

  // Sign in with Email/Password
  signInWithEmail: async (email: string, password: string): Promise<VolunteerProfile> => {
    if (!supabase) {
      // Mock Mode: Search for profile in mock list
      const allProfilesJson = localStorage.getItem(LOCAL_PROFILES_LIST_KEY)
      const allProfiles: VolunteerProfile[] = allProfilesJson ? JSON.parse(allProfilesJson) : []
      
      let foundProfile = allProfiles.find(p => p.email.toLowerCase() === email.toLowerCase())
      
      if (!foundProfile) {
        // Auto-create a mock user if they don't exist to make dev testing extremely easy!
        const generatedName = email.split('@')[0].replace(/[^a-zA-Z]+/g, ' ')
        const titleCaseName = generatedName.replace(/\b\w/g, c => c.toUpperCase())
        foundProfile = {
          id: 'mock-uid-' + Math.random().toString(36).substr(2, 9),
          fullName: titleCaseName || 'Tester User',
          email,
          memberCode: generateMemberCode(),
          role: email.includes('staff') ? 'staff' : 'volunteer',
          createdAt: new Date().toISOString()
        }
        allProfiles.push(foundProfile)
        localStorage.setItem(LOCAL_PROFILES_LIST_KEY, JSON.stringify(allProfiles))
      }

      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(foundProfile))
      return foundProfile
    }

    // Supabase Mode
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Login failed')
    }

    const { data, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (dbError || !data) {
      throw new Error(dbError?.message || 'Volunteer profile not found')
    }

    return mapProfileRow(data)
  },

  // Google SSO Sign-in
  signInWithGoogle: async (): Promise<void> => {
    if (!supabase) {
      // Mock Mode: Simulate Google SSO redirection and auto-login after a short delay
      return new Promise((resolve) => {
        setTimeout(() => {
          const ssoProfile: VolunteerProfile = {
            id: 'mock-google-uid-12345',
            fullName: 'Alex Morgan (Google SSO)',
            email: 'alex.morgan@gmail.com',
            memberCode: 'POT-582931',
            role: 'volunteer',
            createdAt: new Date().toISOString()
          }
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(ssoProfile))
          
          // Ensure it's in all profiles
          const allProfilesJson = localStorage.getItem(LOCAL_PROFILES_LIST_KEY)
          const allProfiles: VolunteerProfile[] = allProfilesJson ? JSON.parse(allProfilesJson) : []
          if (!allProfiles.find(p => p.id === ssoProfile.id)) {
            allProfiles.push(ssoProfile)
            localStorage.setItem(LOCAL_PROFILES_LIST_KEY, JSON.stringify(allProfiles))
          }
          
          window.location.reload()
          resolve()
        }, 1000)
      })
    }

    // Supabase Mode
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/volunteer/checkin`
      }
    })

    if (error) throw error
  },

  // Sign Out
  signOut: async (): Promise<void> => {
    if (!supabase) {
      localStorage.removeItem(LOCAL_PROFILE_KEY)
      localStorage.removeItem(LOCAL_SIGNUPS_KEY)
      window.location.href = '/volunteer'
      return
    }

    await supabase.auth.signOut()
    window.location.href = '/volunteer'
  },

  // Get all volunteer profiles (staff only)
getAllProfiles: async (): Promise<VolunteerProfile[]> => {
  if (!supabase) {
    const allProfilesJson = localStorage.getItem(LOCAL_PROFILES_LIST_KEY)
    const allProfiles: VolunteerProfile[] = allProfilesJson ? JSON.parse(allProfilesJson) : []

    return allProfiles.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data.map(mapProfileRow)
  } catch (e) {
    console.error('Error fetching all profiles:', e)
    return []
  }
},

// Update user role (staff only)
updateUserRole: async (
  userId: string,
  newRole: 'volunteer' | 'staff'
): Promise<VolunteerProfile | null> => {
  if (!supabase) {
    const currentProfileJson = localStorage.getItem(LOCAL_PROFILE_KEY)
    const currentProfile: VolunteerProfile | null = currentProfileJson
      ? JSON.parse(currentProfileJson)
      : null

    if (!currentProfile || currentProfile.role !== 'staff') {
      throw new Error('Only staff can update user roles.')
    }

    const allProfilesJson = localStorage.getItem(LOCAL_PROFILES_LIST_KEY)
    const allProfiles: VolunteerProfile[] = allProfilesJson ? JSON.parse(allProfilesJson) : []

    const updatedProfiles = allProfiles.map(profile =>
      profile.id === userId ? { ...profile, role: newRole } : profile
    )

    localStorage.setItem(LOCAL_PROFILES_LIST_KEY, JSON.stringify(updatedProfiles))

    const updatedProfile = updatedProfiles.find(profile => profile.id === userId) || null

    // If the current user changed their own role, update current profile too
    if (updatedProfile && currentProfile.id === userId) {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile))
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

    return mapProfileRow(data)
  } catch (e) {
    console.error('Error updating user role:', e)
    return null
  }
},

  // Register for an upcoming event
  registerForEvent: async (userId: string, eventId: string, eventTitle: string): Promise<VolunteerSignup> => {
    if (!supabase) {
      // Mock Mode
      const signupsJson = localStorage.getItem(LOCAL_SIGNUPS_KEY)
      const signups: VolunteerSignup[] = signupsJson ? JSON.parse(signupsJson) : []

      // Prevent duplicate registration
      const existing = signups.find(s => s.userId === userId && s.eventId === eventId)
      if (existing) return existing

      const newSignup: VolunteerSignup = {
        id: 'mock-signup-' + Math.random().toString(36).substr(2, 9),
        userId,
        eventId,
        eventTitle,
        status: 'registered',
        hours: 0,
        createdAt: new Date().toISOString()
      }

      signups.push(newSignup)
      localStorage.setItem(LOCAL_SIGNUPS_KEY, JSON.stringify(signups))
      return newSignup
    }

    // Supabase Mode
    const { data, error } = await supabase
      .from('event_volunteers')
      .insert({
        user_id: userId,
        event_id: eventId,
        event_title: eventTitle,
        status: 'registered'
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to register for event')
    }

    return {
      id: data.id,
      userId: data.user_id,
      eventId: data.event_id,
      eventTitle: data.event_title,
      status: data.status,
      hours: data.hours || 0,
      createdAt: data.created_at
    }
  },

  // Get signups for current user
  getMySignups: async (userId: string): Promise<VolunteerSignup[]> => {
    if (!supabase) {
      // Mock Mode
      const signupsJson = localStorage.getItem(LOCAL_SIGNUPS_KEY)
      const signups: VolunteerSignup[] = signupsJson ? JSON.parse(signupsJson) : []
      return signups.filter(s => s.userId === userId)
    }

    try {
      const { data, error } = await supabase
        .from('event_volunteers')
        .select('*')
        .eq('user_id', userId)

      if (error || !data) return []

      return data.map(item => ({
        id: item.id,
        userId: item.user_id,
        eventId: item.event_id,
        eventTitle: item.event_title,
        status: item.status,
        hours: item.hours || 0,
        createdAt: item.created_at,
        checkedInAt: item.checked_in_at
      }))
    } catch {
      return []
    }
  },

  // Staff check-in/check-out function via scanned memberCode
  checkInVolunteer: async (memberCode: string, eventId: string): Promise<{ profile: VolunteerProfile, signup: VolunteerSignup, action: 'checkedIn' | 'checkedOut', hoursLogged: number, checkInTime: string, checkOutTime?: string }> => {
    if (!supabase) {
      const allProfilesJson = localStorage.getItem(LOCAL_PROFILES_LIST_KEY)
      const allProfiles: VolunteerProfile[] = allProfilesJson ? JSON.parse(allProfilesJson) : []
      const profile = allProfiles.find(p => p.memberCode === memberCode)

      if (!profile) {
        throw new Error('No volunteer profile matches member code ' + memberCode)
      }

      const signupsJson = localStorage.getItem(LOCAL_SIGNUPS_KEY)
      const signups: VolunteerSignup[] = signupsJson ? JSON.parse(signupsJson) : []
      let signup = signups.find(s => s.userId === profile.id && s.eventId === eventId)
      const activeSessionJson = sessionStorage.getItem(`checkin-${profile.id}`)
      const activeSession = activeSessionJson ? JSON.parse(activeSessionJson) as CheckInSession : null

      if (activeSession && !activeSession.checkOutTime) {
        if (activeSession.eventId !== eventId) {
          throw new Error('Volunteer is already checked in for another event.')
        }

        const checkOutTime = new Date()
        const checkInTime = new Date(activeSession.checkInTime)
        const durationMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60))
        const hours = Math.round((durationMinutes / 60) * 100) / 100

        sessionStorage.removeItem(`checkin-${profile.id}`)

        if (!signup) {
          signup = {
            id: 'mock-signup-' + Math.random().toString(36).substr(2, 9),
            userId: profile.id,
            eventId,
            eventTitle: 'Event Check-in',
            status: 'attended',
            hours,
            createdAt: new Date().toISOString(),
            checkedInAt: activeSession.checkInTime
          }
          signups.push(signup)
        } else {
          signup.status = 'attended'
          signup.hours = hours
          signup.checkedInAt = activeSession.checkInTime
        }

        localStorage.setItem(LOCAL_SIGNUPS_KEY, JSON.stringify(signups))

        return {
          profile,
          signup,
          action: 'checkedOut',
          hoursLogged: hours,
          checkInTime: activeSession.checkInTime,
          checkOutTime: checkOutTime.toISOString()
        }
      }

      if (!signup) {
        signup = {
          id: 'mock-signup-' + Math.random().toString(36).substr(2, 9),
          userId: profile.id,
          eventId,
          eventTitle: 'Event Check-in',
          status: 'registered',
          hours: 0,
          createdAt: new Date().toISOString()
        }
        signups.push(signup)
      }

      const newSession: CheckInSession = {
        id: 'session-' + Math.random().toString(36).substr(2, 9),
        userId: profile.id,
        eventId,
        checkInTime: new Date().toISOString(),
        duration: 0,
        hoursLogged: 0,
      }
      sessionStorage.setItem(`checkin-${profile.id}`, JSON.stringify(newSession))
      localStorage.setItem(LOCAL_SIGNUPS_KEY, JSON.stringify(signups))

      return {
        profile,
        signup,
        action: 'checkedIn',
        hoursLogged: 0,
        checkInTime: newSession.checkInTime
      }
    }

    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('member_code', memberCode)
      .single()

    if (profileErr || !profileData) {
      throw new Error('Volunteer profile not found for code ' + memberCode)
    }

    const { data: activeSession, error: activeSessionErr } = await supabase
      .from('check_in_sessions')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('event_id', eventId)
      .is('check_out_time', null)
      .maybeSingle()

    if (activeSessionErr) {
      console.error('Error checking active session:', activeSessionErr)
    }

    const { data: signupData, error: signupErr } = await supabase
      .from('event_volunteers')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('event_id', eventId)
      .maybeSingle()

    const mappedProfile: VolunteerProfile = {
      id: profileData.id,
      fullName: profileData.full_name,
      email: profileData.email,
      memberCode: profileData.member_code,
      role: profileData.role,
      createdAt: profileData.created_at,
    }

    const ensureSignup = async () => {
      if (signupData) return signupData
      const { data: newSignup, error: insertErr } = await supabase
        .from('event_volunteers')
        .insert({
          user_id: profileData.id,
          event_id: eventId,
          event_title: 'Event Check-in',
          status: 'registered',
          hours: 0,
          checked_in_at: null
        })
        .select()
        .single()

      if (insertErr || !newSignup) {
        throw new Error('Failed to create event registration for volunteer')
      }
      return newSignup
    }

    if (!activeSession) {
      const signupRow = await ensureSignup()
      const { data: newSession, error: insertSessionErr } = await supabase
        .from('check_in_sessions')
        .insert({
          user_id: profileData.id,
          event_id: eventId,
          check_in_time: new Date().toISOString(),
          hours_logged: 0
        })
        .select()
        .single()

      if (insertSessionErr || !newSession) {
        throw new Error('Failed to start volunteer check-in session')
      }

      await supabase.from('attendance_logs').insert({
        volunteer_id: profileData.id,
        event_id: eventId,
        checked_in_at: newSession.check_in_time
      })

      return {
        profile: mappedProfile,
        signup: {
          id: signupRow.id,
          userId: signupRow.user_id,
          eventId: signupRow.event_id,
          eventTitle: signupRow.event_title,
          status: signupRow.status,
          hours: signupRow.hours || 0,
          createdAt: signupRow.created_at,
          checkedInAt: signupRow.checked_in_at || newSession.check_in_time
        },
        action: 'checkedIn',
        hoursLogged: 0,
        checkInTime: newSession.check_in_time
      }
    }

    if (activeSession.event_id !== eventId) {
      throw new Error('Volunteer is already checked in for another event.')
    }

    const checkOutTime = new Date().toISOString()
    const checkInTime = new Date(activeSession.check_in_time)
    const durationMinutes = Math.floor((new Date(checkOutTime).getTime() - checkInTime.getTime()) / (1000 * 60))
    const hours = Math.round((durationMinutes / 60) * 100) / 100

    const { data: updatedSession, error: updateSessionErr } = await supabase
      .from('check_in_sessions')
      .update({
        check_out_time: checkOutTime,
        hours_logged: hours
      })
      .eq('id', activeSession.id)
      .select()
      .single()

    if (updateSessionErr || !updatedSession) {
      throw new Error('Failed to complete volunteer check-out')
    }

    await supabase
      .from('attendance_logs')
      .update({ checked_out_at: checkOutTime })
      .eq('volunteer_id', profileData.id)
      .eq('event_id', eventId)
      .is('checked_out_at', null)

    let finalSignup = signupData
    if (signupData) {
      const { data: updatedSignup, error: updateSignupErr } = await supabase
        .from('event_volunteers')
        .update({
          status: 'attended',
          hours,
          checked_in_at: activeSession.check_in_time
        })
        .eq('id', signupData.id)
        .select()
        .single()

      if (!updateSignupErr && updatedSignup) {
        finalSignup = updatedSignup
      }
    } else {
      const { data: newSignup, error: insertSignupErr } = await supabase
        .from('event_volunteers')
        .insert({
          user_id: profileData.id,
          event_id: eventId,
          event_title: 'Event Check-in',
          status: 'attended',
          hours,
          checked_in_at: activeSession.check_in_time
        })
        .select()
        .single()

      if (insertSignupErr || !newSignup) {
        throw new Error('Failed to create attended signup record')
      }
      finalSignup = newSignup
    }

    return {
      profile: mappedProfile,
      signup: {
        id: finalSignup.id,
        userId: finalSignup.user_id,
        eventId: finalSignup.event_id,
        eventTitle: finalSignup.event_title,
        status: finalSignup.status,
        hours: finalSignup.hours || 0,
        createdAt: finalSignup.created_at,
        checkedInAt: finalSignup.checked_in_at || activeSession.check_in_time
      },
      action: 'checkedOut',
      hoursLogged: hours,
      checkInTime: activeSession.check_in_time,
      checkOutTime: checkOutTime
    }
  },

  // Volunteer check-in
  startCheckIn: async (userId: string, eventId: string): Promise<CheckInSession> => {
    if (!supabase) {
      // Mock Mode
      const session: CheckInSession = {
        id: 'session-' + Math.random().toString(36).substr(2, 9),
        userId,
        eventId,
        checkInTime: new Date().toISOString(),
        duration: 0,
        hoursLogged: 0,
      }
      // Store in session storage
      sessionStorage.setItem(`checkin-${userId}`, JSON.stringify(session))
      return session
    }

    // Supabase Mode - insert into check_in_sessions table
    const { data, error } = await supabase
      .from('check_in_sessions')
      .insert({
        user_id: userId,
        event_id: eventId,
        check_in_time: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error('Failed to record check-in: ' + (error?.message || 'Unknown error'))
    }

    return {
      id: data.id,
      userId: data.user_id,
      eventId: data.event_id,
      checkInTime: data.check_in_time,
      duration: 0,
      hoursLogged: 0,
    }
  },

  // Volunteer check-out
  checkOut: async (sessionId: string, userId: string): Promise<{ session: CheckInSession; hoursAdded: number }> => {
    if (!supabase) {
      // Mock Mode
      const sessionJson = sessionStorage.getItem(`checkin-${userId}`)
      if (!sessionJson) throw new Error('No active check-in session found')

      const session: CheckInSession = JSON.parse(sessionJson)
      const checkOutTime = new Date()
      const checkInTime = new Date(session.checkInTime)
      const durationMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60))
      const hoursLogged = Math.round((durationMinutes / 60) * 100) / 100

      session.checkOutTime = checkOutTime.toISOString()
      session.duration = durationMinutes
      session.hoursLogged = hoursLogged

      sessionStorage.removeItem(`checkin-${userId}`)

      // Update volunteer total hours
      const profileJson = localStorage.getItem(LOCAL_PROFILE_KEY)
      if (profileJson) {
        const profile: VolunteerProfile = JSON.parse(profileJson)
        profile.totalHours = (profile.totalHours || 0) + hoursLogged
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile))
      }

      return { session, hoursAdded: hoursLogged }
    }

    // Supabase Mode
    const checkOutTime = new Date()
    const { data: sessionData, error: fetchErr } = await supabase
      .from('check_in_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (fetchErr || !sessionData) {
      throw new Error('Session not found')
    }

    const checkInTime = new Date(sessionData.check_in_time)
    const durationMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60))
    const hoursLogged = Math.round((durationMinutes / 60) * 100) / 100

    const { data: updatedSession, error: updateErr } = await supabase
      .from('check_in_sessions')
      .update({
        check_out_time: checkOutTime.toISOString(),
        hours_logged: hoursLogged,
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateErr || !updatedSession) {
      throw new Error('Failed to record check-out')
    }

    // Update profile total hours
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('total_hours')
      .eq('id', userId)
      .single()

    if (!profileErr && profile) {
      const newTotal = (profile.total_hours || 0) + hoursLogged
      await supabase
        .from('profiles')
        .update({ total_hours: newTotal })
        .eq('id', userId)
    }

    return {
      session: {
        id: updatedSession.id,
        userId: updatedSession.user_id,
        eventId: updatedSession.event_id,
        checkInTime: updatedSession.check_in_time,
        checkOutTime: updatedSession.check_out_time,
        duration: durationMinutes,
        hoursLogged,
      },
      hoursAdded: hoursLogged,
    }
  },

  getActiveCheckInSessions: async (): Promise<Array<{
    profile: VolunteerProfile
    eventId: string
    checkInTime: string
    sessionId: string
    hoursLogged: number
  }>> => {
    if (!supabase) {
      const allProfilesJson = localStorage.getItem(LOCAL_PROFILES_LIST_KEY)
      const allProfiles: VolunteerProfile[] = allProfilesJson ? JSON.parse(allProfilesJson) : []
      const activeSessions: Array<{
        profile: VolunteerProfile
        eventId: string
        checkInTime: string
        sessionId: string
        hoursLogged: number
      }> = []

      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i)
        if (!key || !key.startsWith('checkin-')) continue
        const sessionJson = sessionStorage.getItem(key)
        if (!sessionJson) continue
        const session: CheckInSession = JSON.parse(sessionJson)
        const profile = allProfiles.find((p) => p.id === session.userId)
        if (!profile) continue

        activeSessions.push({
          profile,
          eventId: session.eventId,
          checkInTime: session.checkInTime,
          sessionId: session.id,
          hoursLogged: session.hoursLogged || 0,
        })
      }

      return activeSessions
    }

    try {
      const { data: sessions, error: sessionErr } = await supabase
        .from('check_in_sessions')
        .select('*')
        .is('check_out_time', null)

      if (sessionErr || !sessions) return []
      if (sessions.length === 0) return []

      const profileIds = Array.from(new Set(sessions.map((session) => session.user_id)))
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds)

      if (profileErr || !profiles) return []

      const profileMap = new Map<string, VolunteerProfile>()
      profiles.forEach((profileRow) => {
        profileMap.set(profileRow.id, mapProfileRow(profileRow))
      })

      return sessions.map((session) => ({
        profile: profileMap.get(session.user_id)!,
        eventId: session.event_id,
        checkInTime: session.check_in_time,
        sessionId: session.id,
        hoursLogged: session.hours_logged || 0,
      }))
    } catch (e) {
      console.error('Error loading active check-in sessions:', e)
      return []
    }
  },

  // Admin: Update volunteer hours manually
  updateVolunteerHours: async (
    userId: string,
    newTotalHours: number,
    reason?: string
  ): Promise<VolunteerProfile | null> => {
    if (!supabase) {
      // Mock Mode
      const allProfilesJson = localStorage.getItem(LOCAL_PROFILES_LIST_KEY)
      const allProfiles: VolunteerProfile[] = allProfilesJson ? JSON.parse(allProfilesJson) : []

      const updatedProfiles = allProfiles.map(p =>
        p.id === userId ? { ...p, totalHours: newTotalHours } : p
      )

      localStorage.setItem(LOCAL_PROFILES_LIST_KEY, JSON.stringify(updatedProfiles))

      const updated = updatedProfiles.find(p => p.id === userId) || null

      if (updated && localStorage.getItem(LOCAL_PROFILE_KEY)) {
        const currentJson = localStorage.getItem(LOCAL_PROFILE_KEY)
        if (currentJson) {
          const current: VolunteerProfile = JSON.parse(currentJson)
          if (current.id === userId) {
            localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated))
          }
        }
      }

      return updated
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ total_hours: newTotalHours })
        .eq('id', userId)
        .select()
        .single()

      if (error || !data) {
        throw new Error('Failed to update hours')
      }

      // Log the adjustment
      if (reason) {
        await supabase.from('hour_adjustments').insert({
          user_id: userId,
          new_total: newTotalHours,
          reason,
          adjusted_at: new Date().toISOString(),
        }).catch(console.error)
      }

      return mapProfileRow(data)
    } catch (e) {
      console.error('Error updating volunteer hours:', e)
      return null
    }
  },

  // Get current check-in status
  getCurrentCheckInStatus: async (userId: string): Promise<CheckInSession | null> => {
    if (!supabase) {
      const sessionJson = sessionStorage.getItem(`checkin-${userId}`)
      return sessionJson ? JSON.parse(sessionJson) : null
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

      if (error || !data) return null

      return {
        id: data.id,
        userId: data.user_id,
        eventId: data.event_id,
        checkInTime: data.check_in_time,
        duration: 0,
        hoursLogged: 0,
      }
    } catch {
      return null
    }
  },
}
