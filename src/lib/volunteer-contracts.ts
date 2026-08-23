import { z } from 'zod'

export const volunteerEventIdSchema = z.string().trim().regex(
  /^[a-z0-9][a-z0-9_-]{0,63}$/,
  'Use a valid event identifier.',
)

export const volunteerEventRequestSchema = z.object({
  eventId: volunteerEventIdSchema,
}).strict()

export const staffAttendanceRequestSchema = z.object({
  memberCode: z.string().trim().regex(/^POT-(?:[0-9]{6}|[A-F0-9]{16})$/, 'Use a valid member code.'),
  eventId: volunteerEventIdSchema,
}).strict()

export const staffHoursRequestSchema = z.object({
  userId: z.string().uuid(),
  delta: z.number().finite().refine((value) => value !== 0, 'The hour delta cannot be zero.')
    .refine((value) => Math.abs(value) <= 1_000, 'The hour delta is too large.'),
  reason: z.string().trim().min(3, 'A meaningful reason is required.').max(500),
}).strict()

export type VolunteerEventRequest = z.infer<typeof volunteerEventRequestSchema>
export type StaffAttendanceRequest = z.infer<typeof staffAttendanceRequestSchema>
export type StaffHoursRequest = z.infer<typeof staffHoursRequestSchema>

export type VolunteerProfileDto = {
  id: string
  name: string
  email: string
  memberCode: string
  createdAt: string
  totalHours: number
  isStaff: boolean
  role: 'volunteer' | 'staff'
}

export type VolunteerRegistrationDto = {
  id: string
  userId: string
  eventId: string
  eventTitle: string
  status: 'registered' | 'attended' | 'absent'
  hours: number
  createdAt: string
  checkedInAt?: string
}

export type EventRosterDto = {
  signup: VolunteerRegistrationDto
  profile: Omit<VolunteerProfileDto, 'isStaff' | 'role'> | null
}

export type ActiveAttendanceDto = {
  profile: Omit<VolunteerProfileDto, 'isStaff' | 'role'>
  eventId: string
  checkInTime: string
  sessionId: string
  hoursLogged: number
}

export type StaffAttendanceResultDto = {
  profile: Omit<VolunteerProfileDto, 'isStaff' | 'role'>
  signup: VolunteerRegistrationDto
  action: 'checkedIn' | 'checkedOut'
  hoursLogged: number
  checkInTime: string
  checkOutTime?: string
  totalHours: number
}

export type VolunteerAnalyticsDto = {
  stats: {
    totalVolunteers: number
    totalStaff: number
    totalEvents: number
    totalHoursLogged: number
    averageHoursPerVolunteer: number
    upcomingEvents: number
    completedEvents: number
  }
  events: Array<{
    id: string
    title: string
    date: string
    volunteersAttended: number
    volunteersRegistered: number
    totalHoursAwarded: number
  }>
  topVolunteers: Array<{
    id: string
    name: string
    email: string
    totalHours: number
  }>
}

export function mapProfileDto(value: unknown, isStaff = false): VolunteerProfileDto {
  const row = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const totalHours = Number(row.total_hours ?? row.totalHours ?? 0)
  return {
    id: String(row.id ?? ''),
    name: String(row.full_name ?? row.name ?? 'POT Volunteer'),
    email: String(row.email ?? ''),
    memberCode: String(row.member_code ?? row.memberCode ?? 'POT-UNAVAILABLE'),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date(0).toISOString()),
    totalHours: Number.isFinite(totalHours) && totalHours >= 0 ? totalHours : 0,
    isStaff,
    role: isStaff ? 'staff' : 'volunteer',
  }
}

export function mapPublicProfileDto(value: unknown) {
  const dto = mapProfileDto(value)
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    memberCode: dto.memberCode,
    createdAt: dto.createdAt,
    totalHours: dto.totalHours,
  }
}

export function mapRegistrationDto(value: unknown, eventTitle = 'Volunteer event') : VolunteerRegistrationDto {
  const row = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const status = row.status === 'attended' || row.status === 'absent' ? row.status : 'registered'
  const hours = Number(row.hours ?? 0)
  return {
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? row.userId ?? ''),
    eventId: String(row.event_id ?? row.eventId ?? ''),
    eventTitle: eventTitle || 'Volunteer event',
    status,
    hours: Number.isFinite(hours) && hours >= 0 ? hours : 0,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date(0).toISOString()),
    ...(row.checked_in_at || row.checkedInAt ? { checkedInAt: String(row.checked_in_at ?? row.checkedInAt) } : {}),
  }
}

export function mapAttendanceResult(value: unknown): StaffAttendanceResultDto {
  const row = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const profile = mapPublicProfileDto(row.profile)
  const registration = mapRegistrationDto(row.registration)
  const hoursLogged = Number(row.hours_logged ?? 0)
  const totalHours = Number((row.profile && typeof row.profile === 'object' && (row.profile as Record<string, unknown>).total_hours) ?? 0)
  return {
    profile,
    signup: registration,
    action: row.action === 'checkedOut' ? 'checkedOut' : 'checkedIn',
    hoursLogged: Number.isFinite(hoursLogged) && hoursLogged >= 0 ? hoursLogged : 0,
    checkInTime: String(row.check_in_at ?? ''),
    ...(row.check_out_at ? { checkOutTime: String(row.check_out_at) } : {}),
    totalHours: Number.isFinite(totalHours) && totalHours >= 0 ? totalHours : 0,
  }
}
