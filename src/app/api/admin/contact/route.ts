import { contentErrorResponse, readJson } from '@/lib/admin-api'
import {
  adminContactListQuerySchema,
  adminContactStatusUpdateSchema,
} from '@/lib/content-contracts'
import { decodeContactCursor } from '@/lib/contact-pagination'
import { listAdminContact, updateAdminContactStatus } from '@/lib/content-repository'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { jsonNoStore, sameOrigin, sameOriginFailure } from '@/lib/volunteer-api'

function listQuery(request: Request) {
  const params = new URL(request.url).searchParams
  // Object.fromEntries preserves unknown keys so the strict Zod schema can
  // reject accidental or future client parameters instead of ignoring them.
  return adminContactListQuerySchema.safeParse(Object.fromEntries(params.entries()))
}

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const parsed = listQuery(request)
  if (!parsed.success) return jsonNoStore({ error: 'Invalid contact pagination.' }, 400)
  if (parsed.data.cursor && !decodeContactCursor(parsed.data.cursor)) {
    return jsonNoStore({ error: 'Invalid contact pagination.' }, 400)
  }

  try {
    return jsonNoStore(await listAdminContact(parsed.data))
  } catch (error) {
    return contentErrorResponse(error, 'Contact submissions could not be loaded.')
  }
}

async function updateAuthorized(request: Request) {
  const parsed = adminContactStatusUpdateSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid contact status update.' }, 400)

  try {
    return jsonNoStore({ submission: await updateAdminContactStatus(parsed.data.id, parsed.data.status) })
  } catch (error) {
    return contentErrorResponse(error, 'Contact status could not be changed.')
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  return updateAuthorized(request)
}

export async function PUT(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)
  if (!sameOrigin(request)) return sameOriginFailure()
  return updateAuthorized(request)
}
