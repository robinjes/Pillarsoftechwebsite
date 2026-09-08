import { NextResponse } from 'next/server'
import type { AuthFailure } from './server'

export function authFailureResponse(failure: AuthFailure): NextResponse {
  return NextResponse.json(
    { error: failure.code, message: failure.message },
    {
      status: failure.status,
      headers: { 'Cache-Control': 'private, no-store' },
    }
  )
}
