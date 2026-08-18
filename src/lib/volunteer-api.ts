import { NextResponse } from 'next/server'

export function safeNoStoreHeaders(): HeadersInit {
  return { 'Cache-Control': 'private, no-store' }
}

export function jsonNoStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: safeNoStoreHeaders() })
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin || origin === 'null') return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export function sameOriginFailure(): NextResponse {
  return jsonNoStore({ error: 'same_origin_required', message: 'This request must come from the site.' }, 403)
}

export function safeRpcResponse(
  error: unknown,
  fallback: string,
  options: { invalidStatus?: number; unavailableStatus?: number } = {},
): NextResponse {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : ''
  const invalidStatus = options.invalidStatus ?? 409
  const unavailableStatus = options.unavailableStatus ?? 503

  if (code === '22023' || code === 'P0002' || code === 'P0003' || code === 'P0004' || code === 'P0005') {
    return jsonNoStore({ error: 'request_unavailable', message: fallback }, invalidStatus)
  }
  if (code === '42501' || code === '28000') {
    return jsonNoStore({ error: 'not_authorized', message: fallback }, 403)
  }
  return jsonNoStore({ error: 'service_unavailable', message: fallback }, unavailableStatus)
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}
