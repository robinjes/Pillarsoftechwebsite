import 'server-only'

import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseConfigurationError } from '@/lib/supabase/config'

export type AuthFailureCode =
  | 'configuration_unavailable'
  | 'unauthenticated'
  | 'not_staff'
  | 'authorization_unavailable'

export interface AuthFailure {
  ok: false
  code: AuthFailureCode
  status: 401 | 403 | 503
  message: string
}

export interface VerifiedUser {
  ok: true
  user: User
}

export interface VerifiedStaff extends VerifiedUser {
  isStaff: true
}

export type VerifiedUserResult = VerifiedUser | AuthFailure
export type VerifiedStaffResult = VerifiedStaff | AuthFailure

function configurationFailure(message = 'Authentication is not configured on this server.'): AuthFailure {
  return {
    ok: false,
    code: 'configuration_unavailable',
    status: 503,
    message,
  }
}

function unauthenticatedFailure(): AuthFailure {
  return {
    ok: false,
    code: 'unauthenticated',
    status: 401,
    message: 'A verified sign-in is required.',
  }
}

function notStaffFailure(): AuthFailure {
  return {
    ok: false,
    code: 'not_staff',
    status: 403,
    message: 'This account is not authorized for staff access.',
  }
}

function authorizationUnavailableFailure(): AuthFailure {
  return {
    ok: false,
    code: 'authorization_unavailable',
    status: 503,
    message: 'Staff authorization is temporarily unavailable.',
  }
}

export async function requireVerifiedUser(): Promise<VerifiedUserResult> {
  const client = await createSupabaseServerClient()
  if (!client) return configurationFailure()

  try {
    // getUser performs Auth-server verification; a session cookie alone is not
    // an authorization decision.
    const {
      data: { user },
      error,
    } = await client.auth.getUser()

    if (error || !user) return unauthenticatedFailure()
    return { ok: true, user }
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return configurationFailure()
    return unauthenticatedFailure()
  }
}

async function hasStaffMembership(userId: string): Promise<boolean | null> {
  const client = await createSupabaseServerClient()
  if (!client) return null

  const { data, error } = await client
    .from('staff_members')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return null
  return Boolean(data)
}

export async function requireVerifiedStaff(): Promise<VerifiedStaffResult> {
  const userResult = await requireVerifiedUser()
  if (!userResult.ok) return userResult

  const staffMembership = await hasStaffMembership(userResult.user.id)
  if (staffMembership === null) return authorizationUnavailableFailure()
  if (!staffMembership) return notStaffFailure()

  return { ...userResult, isStaff: true }
}

export async function getVerifiedAuthContext(): Promise<
  (VerifiedUser & { isStaff: boolean }) | AuthFailure
> {
  const userResult = await requireVerifiedUser()
  if (!userResult.ok) return userResult

  const staffMembership = await hasStaffMembership(userResult.user.id)
  if (staffMembership === null) return authorizationUnavailableFailure()

  return { ...userResult, isStaff: staffMembership }
}

// Short aliases keep route handlers readable while retaining explicit names
// for tests and code review.
export const requireUser = requireVerifiedUser
export const requireStaff = requireVerifiedStaff
