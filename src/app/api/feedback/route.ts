import { NextResponse } from 'next/server'

import { getPublicFeedbackForm } from '@/lib/feedback-server'
import { jsonNoStore } from '@/lib/volunteer-api'

export const dynamic = 'force-dynamic'

// A short shared cache absorbs a whole room opening the form at once. Edits
// from the host editor show up within a few seconds.
const FEEDBACK_PUBLIC_CACHE_CONTROL = 'public, max-age=0, s-maxage=5, stale-while-revalidate=10'

export async function GET() {
  try {
    const form = await getPublicFeedbackForm()
    return NextResponse.json(
      { form },
      { headers: { 'Cache-Control': FEEDBACK_PUBLIC_CACHE_CONTROL, 'X-Robots-Tag': 'noindex, nofollow' } },
    )
  } catch {
    return jsonNoStore({ error: 'Feedback is temporarily unavailable.' }, 503)
  }
}
