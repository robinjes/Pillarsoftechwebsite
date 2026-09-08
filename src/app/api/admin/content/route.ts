import { NextResponse } from 'next/server'

import { contentErrorResponse, readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { contentDocumentSchema } from '@/lib/content-contracts'
import { listAdminContent, saveAdminContent } from '@/lib/content-repository'
import { sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const keyPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const key = new URL(request.url).searchParams.get('key')?.trim() || undefined
  if (key && !keyPattern.test(key)) return NextResponse.json({ error: 'Invalid content key.' }, { status: 400 })
  try {
    return NextResponse.json({ documents: await listAdminContent(key) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return contentErrorResponse(error, 'Site content could not be loaded.')
  }
}

export async function POST(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = contentDocumentSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid site content.', issues: parsed.error.issues }, { status: 400 })
  try {
    return NextResponse.json({ document: await saveAdminContent(parsed.data, auth.user.id) })
  } catch (error) {
    return contentErrorResponse(error, 'Site content could not be saved.')
  }
}

export async function PUT(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  const parsed = contentDocumentSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid site content.', issues: parsed.error.issues }, { status: 400 })
  try {
    return NextResponse.json({ document: await saveAdminContent(parsed.data, auth.user.id) })
  } catch (error) {
    return contentErrorResponse(error, 'Site content could not be saved.')
  }
}
