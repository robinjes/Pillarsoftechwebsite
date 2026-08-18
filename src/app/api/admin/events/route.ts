import { NextResponse } from 'next/server'

import { contentErrorResponse, readJson } from '@/lib/admin-api'
import {
  createAdminEvent,
  deleteAdminEvent,
  listAdminEvents,
  setAdminEventState,
  updateAdminEvent,
} from '@/lib/content-repository'
import { eventWriteSchema } from '@/lib/content-contracts'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'

const eventIdPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/

function eventIdFromRequest(request: Request): string | null {
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? ''
  return eventIdPattern.test(id) ? id : null
}

export async function GET() {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  try {
    return NextResponse.json({ events: await listAdminEvents() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return contentErrorResponse(error, 'Events could not be loaded.')
  }
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const parsed = eventWriteSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event body.', issues: parsed.error.issues }, { status: 400 })
  try {
    return NextResponse.json({ event: await createAdminEvent(parsed.data, auth.user.id) }, { status: 201 })
  } catch (error) {
    return contentErrorResponse(error, 'Event could not be created.')
  }
}

export async function PUT(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const id = eventIdFromRequest(request)
  if (!id) return NextResponse.json({ error: 'A valid event id is required.' }, { status: 400 })
  const parsed = eventWriteSchema.safeParse(await readJson(request))
  if (!parsed.success || (parsed.data.id && parsed.data.id !== id)) {
    return NextResponse.json({ error: 'Invalid event body.', ...(parsed.success ? {} : { issues: parsed.error.issues }) }, { status: 400 })
  }
  try {
    return NextResponse.json({ event: await updateAdminEvent(id, parsed.data, auth.user.id) })
  } catch (error) {
    return contentErrorResponse(error, 'Event could not be updated.')
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const id = eventIdFromRequest(request)
  if (!id) return NextResponse.json({ error: 'A valid event id is required.' }, { status: 400 })
  const parsed = (await readJson(request)) as unknown
  const action = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'action' in parsed ? parsed.action : undefined
  if (typeof action !== 'string' || !['publish', 'unpublish', 'archive'].includes(action) || Object.keys(parsed as object).length !== 1) {
    return NextResponse.json({ error: 'Use one of publish, unpublish, or archive.' }, { status: 400 })
  }
  try {
    return NextResponse.json({ event: await setAdminEventState(id, action as 'publish' | 'unpublish' | 'archive', auth.user.id) })
  } catch (error) {
    return contentErrorResponse(error, 'Event state could not be changed.')
  }
}

export async function DELETE(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const id = eventIdFromRequest(request)
  if (!id) return NextResponse.json({ error: 'A valid event id is required.' }, { status: 400 })
  try {
    await deleteAdminEvent(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return contentErrorResponse(error, 'Event could not be deleted.')
  }
}
