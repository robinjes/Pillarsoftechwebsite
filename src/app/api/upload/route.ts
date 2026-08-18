import { NextResponse } from 'next/server'

// Upload signing/finalization is intentionally outside Task 03. Keeping this
// The route is fail-closed until a reviewed signed-storage flow is implemented.
export async function POST() {
  return NextResponse.json({ error: 'Upload storage is not enabled.' }, { status: 410 })
}
