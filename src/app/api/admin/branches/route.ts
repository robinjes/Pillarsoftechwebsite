import { NextResponse } from 'next/server'

import { contentErrorResponse, readJson } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import {
  branchCodeSchema,
  branchDocumentSchema,
} from '@/lib/content-contracts'
import {
  listAdminBranches,
  saveAdminBranch,
} from '@/lib/content-repository'
import { sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

const branchKeyPattern = /^branch:(ca|ga)$/

function branchFromRequest(request: Request) {
  const value = new URL(request.url).searchParams.get('branch')?.trim() ?? ''
  if (!value) return undefined
  const parsed = branchCodeSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  const branch = branchFromRequest(request)
  if (branch === null) return NextResponse.json({ error: 'Invalid branch.' }, { status: 400 })

  try {
    const branches = await listAdminBranches()
    return NextResponse.json(
      { branches: branch ? branches.filter((document) => document.branch === branch) : branches },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return contentErrorResponse(error, 'Branch content could not be loaded.')
  }
}

async function saveBranch(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = branchDocumentSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid branch document.', issues: parsed.error.issues },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  if (!branchKeyPattern.test(parsed.data.key) || parsed.data.key !== `branch:${parsed.data.branch}`) {
    return NextResponse.json({ error: 'Branch key must match the branch code.' }, { status: 400 })
  }

  try {
    return NextResponse.json(
      { branch: await saveAdminBranch(parsed.data, auth.user.id) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return contentErrorResponse(error, 'Branch content could not be saved.')
  }
}

export async function POST(request: Request) {
  return saveBranch(request)
}

export async function PUT(request: Request) {
  return saveBranch(request)
}
