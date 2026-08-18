import { NextResponse } from 'next/server'

import { contentErrorResponse, readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { deleteAdminImpact, listAdminImpact, saveAdminImpact } from '@/lib/content-repository'
import { impactMetricSchema } from '@/lib/content-contracts'

const keyPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/

export async function GET() {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  try {
    return NextResponse.json({ metrics: await listAdminImpact() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return contentErrorResponse(error, 'Impact metrics could not be loaded.')
  }
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const parsed = impactMetricSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid impact metric.', issues: parsed.error.issues }, { status: 400 })
  try {
    return NextResponse.json({ metric: await saveAdminImpact(parsed.data, auth.user.id) })
  } catch (error) {
    return contentErrorResponse(error, 'Impact metric could not be saved.')
  }
}

export async function PUT(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const parsed = impactMetricSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid impact metric.', issues: parsed.error.issues }, { status: 400 })
  try {
    return NextResponse.json({ metric: await saveAdminImpact(parsed.data, auth.user.id) })
  } catch (error) {
    return contentErrorResponse(error, 'Impact metric could not be saved.')
  }
}

export async function DELETE(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const key = new URL(request.url).searchParams.get('key')?.trim() ?? ''
  if (!keyPattern.test(key)) return NextResponse.json({ error: 'A valid metric key is required.' }, { status: 400 })
  try {
    await deleteAdminImpact(key)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return contentErrorResponse(error, 'Impact metric could not be deleted.')
  }
}
