import { NextResponse } from 'next/server'

import { getPublicQnaSnapshot } from '@/lib/qna-server'
import { jsonNoStore } from '@/lib/volunteer-api'

export const dynamic = 'force-dynamic'

// The audience list polls this endpoint. A two-second shared cache keeps a
// full room of phones to roughly one database read per interval, while the
// snapshot itself contains only what every attendee can already see.
const QNA_PUBLIC_CACHE_CONTROL = 'public, max-age=0, s-maxage=2, stale-while-revalidate=4'

export async function GET() {
  try {
    const snapshot = await getPublicQnaSnapshot()
    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': QNA_PUBLIC_CACHE_CONTROL,
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch {
    return jsonNoStore({ error: 'Q&A is temporarily unavailable.' }, 503)
  }
}
