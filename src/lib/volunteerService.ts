'use client'

import { getSafeNextPath } from '@/lib/auth/redirect'
import { getOAuthCallbackOrigin } from '@/lib/auth/redirect'
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client'
import type {
  ActiveAttendanceDto,
  EventRosterDto,
  StaffAttendanceResultDto,
  VolunteerAnalyticsDto,
  VolunteerProfileDto,
  VolunteerRegistrationDto,
} from '@/lib/volunteer-contracts'

export interface VolunteerProfile {
  id: string
  fullName: string
  email: string
  memberCode: string
  role: 'volunteer' | 'staff'
  createdAt: string
  totalHours: number
  isStaff?: boolean
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

export type StaffAttendanceResult = {
  profile: VolunteerProfile
  signup: VolunteerSignup
  action: 'checkedIn' | 'checkedOut'
  hoursLogged: number
  checkInTime: string
  checkOutTime?: string
  totalHours: number
}

export type VolunteerAnalytics = VolunteerAnalyticsDto

export class VolunteerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = 'request_failed',
  ) {
    super(message)
    this.name = 'VolunteerApiError'
  }
}

function mapProfile(dto: VolunteerProfileDto): VolunteerProfile {
  return {
    id: dto.id,
    fullName: dto.name,
    email: dto.email,
    memberCode: dto.memberCode,
    role: dto.role,
    createdAt: dto.createdAt,
    totalHours: dto.totalHours,
    isStaff: dto.isStaff,
  }
}

function mapSignup(dto: VolunteerRegistrationDto): VolunteerSignup {
  return {
    id: dto.id,
    userId: dto.userId,
    eventId: dto.eventId,
    eventTitle: dto.eventTitle,
    status: dto.status,
    hours: dto.hours,
    createdAt: dto.createdAt,
    checkedInAt: dto.checkedInAt,
  }
}

function mapRoster(dto: EventRosterDto): EventRosterEntry {
  const profile = dto.profile
    ? {
        id: dto.profile.id,
        fullName: dto.profile.name,
        email: dto.profile.email,
        memberCode: dto.profile.memberCode,
        role: 'volunteer' as const,
        createdAt: dto.profile.createdAt,
        totalHours: dto.profile.totalHours,
      }
    : null
  return { signup: mapSignup(dto.signup), profile }
}

function mapActive(dto: ActiveAttendanceDto): ActiveCheckInSession {
  return {
    profile: {
      id: dto.profile.id,
      fullName: dto.profile.name,
      email: dto.profile.email,
      memberCode: dto.profile.memberCode,
      role: 'volunteer',
      createdAt: dto.profile.createdAt,
      totalHours: dto.profile.totalHours,
    },
    eventId: dto.eventId,
    checkInTime: dto.checkInTime,
    sessionId: dto.sessionId,
    hoursLogged: dto.hoursLogged,
  }
}

function mapAttendance(dto: StaffAttendanceResultDto): StaffAttendanceResult {
  return {
    profile: {
      id: dto.profile.id,
      fullName: dto.profile.name,
      email: dto.profile.email,
      memberCode: dto.profile.memberCode,
      role: 'volunteer',
      createdAt: dto.profile.createdAt,
      totalHours: dto.profile.totalHours,
    },
    signup: mapSignup(dto.signup),
    action: dto.action,
    hoursLogged: dto.hoursLogged,
    checkInTime: dto.checkInTime,
    checkOutTime: dto.checkOutTime,
    totalHours: dto.totalHours,
  }
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: 'no-store' })
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // A non-JSON error still receives the safe route-level fallback below.
  }
  if (!response.ok) {
    const errorBody = body && typeof body === 'object' ? body as Record<string, unknown> : {}
    throw new VolunteerApiError(
      typeof errorBody.message === 'string' ? errorBody.message : 'The volunteer service could not complete the request.',
      response.status,
      typeof errorBody.error === 'string' ? errorBody.error : 'request_failed',
    )
  }
  return body as T
}

async function postApi<T>(path: string, body: unknown): Promise<T> {
  return fetchApi<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export const volunteerService = {
  isSupabaseConfigured: (): boolean => isSupabaseConfigured(),

  getCurrentUser: async (): Promise<VolunteerProfile | null> => {
    if (!isSupabaseConfigured()) return null
    try {
      const data = await fetchApi<{ profile: VolunteerProfileDto }>('/api/me')
      return data.profile ? mapProfile(data.profile) : null
    } catch (error) {
      if (error instanceof VolunteerApiError && error.status === 401) return null
      throw error
    }
  },

  signInWithGoogle: async (next = '/volunteer'): Promise<void> => {
    if (!supabase || typeof window === 'undefined') {
      throw new Error('Google sign-in is not configured on this deployment.')
    }
    const safeNext = getSafeNextPath(next, '/volunteer')
    const callback = new URL('/auth/callback', getOAuthCallbackOrigin(window.location.origin))
    callback.searchParams.set('next', safeNext)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callback.toString(),
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) throw new Error('Google sign-in could not be started.')
  },

  signOut: async (): Promise<void> => {
    await fetch('/auth/signout', { method: 'POST', cache: 'no-store' })
    if (supabase) await supabase.auth.signOut({ scope: 'local' })
    if (typeof window !== 'undefined') window.location.assign('/volunteer')
  },

  getAllProfiles: async (): Promise<VolunteerProfile[]> => {
    const data = await fetchApi<{ profiles: VolunteerProfileDto[] }>('/api/admin/volunteers')
    return (data.profiles || []).map(mapProfile)
  },

  registerForEvent: async (eventId: string): Promise<VolunteerSignup> => {
    const data = await postApi<{ registration: VolunteerRegistrationDto }>('/api/volunteer/register', { eventId })
    return mapSignup(data.registration)
  },

  withdrawFromEvent: async (eventId: string): Promise<void> => {
    await postApi('/api/volunteer/cancel', { eventId })
  },

  getMySignups: async (): Promise<VolunteerSignup[]> => {
    const data = await fetchApi<{ registrations: VolunteerRegistrationDto[] }>('/api/volunteer/registrations')
    return (data.registrations || []).map(mapSignup)
  },

  getEventRoster: async (eventId: string): Promise<EventRosterEntry[]> => {
    const data = await fetchApi<{ roster: EventRosterDto[] }>(`/api/admin/volunteers/roster?eventId=${encodeURIComponent(eventId)}`)
    return (data.roster || []).map(mapRoster)
  },

  searchProfiles: async (query: string): Promise<VolunteerProfile[]> => {
    const normalized = query.trim()
    if (!normalized) return []
    const data = await fetchApi<{ profiles: VolunteerProfileDto[] }>(`/api/admin/volunteers?q=${encodeURIComponent(normalized)}`)
    return (data.profiles || []).slice(0, 8).map(mapProfile)
  },

  getActiveCheckInSessions: async (): Promise<ActiveCheckInSession[]> => {
    const data = await fetchApi<{ sessions: ActiveAttendanceDto[] }>('/api/admin/attendance/active')
    return (data.sessions || []).map(mapActive)
  },

  updateVolunteerHours: async (userId: string, delta: number, reason: string): Promise<VolunteerProfile> => {
    const data = await postApi<{ profile: VolunteerProfileDto }>('/api/admin/hours', { userId, delta, reason })
    return mapProfile(data.profile)
  },

  checkInVolunteer: async (memberCode: string, eventId: string): Promise<StaffAttendanceResult> => {
    const data = await postApi<{ attendance: StaffAttendanceResultDto }>('/api/admin/attendance', { memberCode, eventId })
    return mapAttendance(data.attendance)
  },

  getAnalytics: async (): Promise<VolunteerAnalytics> => fetchApi<VolunteerAnalytics>('/api/admin/analytics'),

  downloadAttendanceCsv: async (eventId?: string): Promise<void> => {
    const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : ''
    const response = await fetch(`/api/admin/exports/volunteer-attendance${query}`, { cache: 'no-store' })
    if (!response.ok) throw new VolunteerApiError('The attendance export could not be created.', response.status)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'volunteer-attendance.csv'
    link.click()
    URL.revokeObjectURL(url)
  },

  onAuthStateChange: (callback: () => void) => {
    if (!supabase) return () => undefined
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => callback())
    return () => subscription.unsubscribe()
  },
}
