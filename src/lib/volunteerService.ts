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

    const { data, error: dbError } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single()

    if (dbError || !data) {
      throw new Error(dbError?.message || 'Profile database creation failed')
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

  // Staff check-in function via scanned memberCode
  checkInVolunteer: async (memberCode: string, eventId: string): Promise<{ profile: VolunteerProfile, signup: VolunteerSignup }> => {
    if (!supabase) {
      // Mock Mode
      const allProfilesJson = localStorage.getItem(LOCAL_PROFILES_LIST_KEY)
      const allProfiles: VolunteerProfile[] = allProfilesJson ? JSON.parse(allProfilesJson) : []
      const profile = allProfiles.find(p => p.memberCode === memberCode)

      if (!profile) {
        throw new Error('No volunteer profile matches member code ' + memberCode)
      }

      const signupsJson = localStorage.getItem(LOCAL_SIGNUPS_KEY)
      const signups: VolunteerSignup[] = signupsJson ? JSON.parse(signupsJson) : []

      // Find registration for the event, or create an on-the-spot registration
      let signup = signups.find(s => s.userId === profile.id && s.eventId === eventId)

      if (!signup) {
        // Auto-register them on spot
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

      // Mark as attended
      signup.status = 'attended'
      signup.checkedInAt = new Date().toISOString()
      signup.hours = 3.5 // Assign default event volunteer hours

      localStorage.setItem(LOCAL_SIGNUPS_KEY, JSON.stringify(signups))
      return { profile, signup }
    }

    // Supabase Mode
    // 1. Fetch profile matching member_code
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('member_code', memberCode)
      .single()

    if (profileErr || !profileData) {
      throw new Error('Volunteer profile not found for code ' + memberCode)
    }

    // 2. Look up event signup
    let { data: signupData, error: signupErr } = await supabase
      .from('event_volunteers')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('event_id', eventId)
      .maybeSingle()

    // 3. Check-in or insert new on-the-spot signup
    if (!signupData) {
      const { data: newSignup, error: insertErr } = await supabase
        .from('event_volunteers')
        .insert({
          user_id: profileData.id,
          event_id: eventId,
          event_title: 'Event Check-in',
          status: 'attended',
          hours: 3.5 // Default volunteer session hours
        })
        .select()
        .single()

      if (insertErr || !newSignup) {
        throw new Error('Failed to register volunteer at check-in')
      }
      signupData = newSignup
    } else {
      const { data: updatedSignup, error: updateErr } = await supabase
        .from('event_volunteers')
        .update({
          status: 'attended',
          hours: 3.5
        })
        .eq('id', signupData.id)
        .select()
        .single()

      if (updateErr || !updatedSignup) {
        throw new Error('Failed to update volunteer check-in status')
      }
      signupData = updatedSignup
    }

    // 4. Log checkin
    await supabase.from('attendance_logs').insert({
      volunteer_id: profileData.id,
      event_id: eventId
    })

    return {
      profile: {
        id: profileData.id,
        fullName: profileData.full_name,
        email: profileData.email,
        memberCode: profileData.member_code,
        role: profileData.role,
        createdAt: profileData.created_at
      },
      signup: {
        id: signupData.id,
        userId: signupData.user_id,
        eventId: signupData.event_id,
        eventTitle: signupData.event_title,
        status: signupData.status,
        hours: signupData.hours || 0,
        createdAt: signupData.created_at,
        checkedInAt: new Date().toISOString()
      }
    }
  }
}
