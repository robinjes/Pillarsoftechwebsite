import { NextResponse } from 'next/server'

import { contentErrorResponse, readJson } from '@/lib/admin-api'
import { disableAdminForm, listAdminForms, saveAdminForm } from '@/lib/content-repository'
import { formWriteSchema } from '@/lib/content-contracts'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const idPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/

function lookup(request: Request) {
  const params = new URL(request.url).searchParams
  const eventId = params.get('eventId')?.trim() ?? ''
  const kind = params.get('kind') ?? 'participant'
  return { eventId: idPattern.test(eventId) ? eventId : null, kind: kind === 'volunteer' ? 'volunteer' as const : kind === 'participant' ? 'participant' as const : null }
}

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const { eventId, kind } = lookup(request)
  const params = new URL(request.url).searchParams
  if ((params.has('eventId') && !eventId) || (params.has('kind') && !kind)) return NextResponse.json({ error: 'Invalid form lookup.' }, { status: 400 })
  try {
    return NextResponse.json({ forms: await listAdminForms(eventId ?? undefined, kind ?? undefined) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return contentErrorResponse(error, 'Forms could not be loaded.')
  }
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = formWriteSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid form body.', issues: parsed.error.issues }, { status: 400 })
  try {
    return NextResponse.json({ form: await saveAdminForm(parsed.data, auth.user.id) })
  } catch (error) {
    return contentErrorResponse(error, 'Form could not be saved.')
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const { eventId, kind } = lookup(request)
  if (!eventId || !kind) return NextResponse.json({ error: 'A valid eventId and kind are required.' }, { status: 400 })
  const body = await readJson(request)
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !('isActive' in body) || typeof body.isActive !== 'boolean') {
    return NextResponse.json({ error: 'Only isActive is accepted.' }, { status: 400 })
  }
  if (body.isActive) return NextResponse.json({ error: 'Use POST to save a validated form.' }, { status: 400 })
  try {
    return NextResponse.json({ form: await disableAdminForm(eventId, kind, auth.user.id) })
  } catch (error) {
    return contentErrorResponse(error, 'Form could not be disabled.')
  }
}

export async function DELETE(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const { eventId, kind } = lookup(request)
  if (!eventId || !kind) return NextResponse.json({ error: 'A valid eventId and kind are required.' }, { status: 400 })
  try {
    return NextResponse.json({ form: await disableAdminForm(eventId, kind, auth.user.id) })
  } catch (error) {
    return contentErrorResponse(error, 'Form could not be disabled.')
  }
}
