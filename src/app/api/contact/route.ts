import { NextResponse } from 'next/server'

import { readJson } from '@/lib/admin-api'
import { contactSubmissionSchema } from '@/lib/content-contracts'
import { allowContactAttempt, normalizeContactIdentity } from '@/lib/contact-abuse'
import { insertContactSubmission } from '@/lib/content-repository'

function requestIdentity(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return normalizeContactIdentity(forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown-client')
}

export async function POST(request: Request) {
  const parsed = contactSubmissionSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid contact body.', issues: parsed.error.issues }, { status: 400 })
  if (parsed.data.honeypot !== '') return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 })
  if (!allowContactAttempt(requestIdentity(request))) return NextResponse.json({ error: 'Too many contact attempts. Try again later.' }, { status: 429 })

  try {
    await insertContactSubmission({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
      subject: parsed.data.subject,
      schoolName: parsed.data.schoolName,
      studentCount: parsed.data.studentCount,
    })
    return NextResponse.json({ accepted: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Contact submissions are temporarily unavailable.' }, { status: 503 })
  }
}
