import { NextResponse } from 'next/server'

import { readJson } from '@/lib/admin-api'
import { participantSubmissionSchema, validateParticipantAnswers } from '@/lib/content-contracts'
import {
  getParticipantRegistrationContext,
  insertParticipantRegistration,
  participantRegistrationCount,
} from '@/lib/content-repository'

export async function POST(request: Request) {
  const parsed = participantSubmissionSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid registration body.', issues: parsed.error.issues }, { status: 400 })
  if (parsed.data.honeypot !== '') return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 })

  try {
    const context = await getParticipantRegistrationContext(parsed.data.eventId)
    if (!context || context.event.publication_state !== 'published') {
      return NextResponse.json({ error: 'Event registration is unavailable.' }, { status: 404 })
    }
    if (context.event.participant_registration_state !== 'open') {
      return NextResponse.json({ error: 'Registration is closed or full.' }, { status: 409 })
    }
    const issues = validateParticipantAnswers(context.form, parsed.data)
    if (issues.length > 0) return NextResponse.json({ error: 'Answers do not match this form.', issues }, { status: 400 })

    const capacity = context.event.participant_capacity == null ? null : Number(context.event.participant_capacity)
    if (capacity !== null && (await participantRegistrationCount(parsed.data.eventId)) >= capacity) {
      return NextResponse.json({ error: 'Registration is full.' }, { status: 409 })
    }
    const submittedData: Record<string, unknown> = { ...parsed.data.answers }
    if (parsed.data.consent !== undefined) submittedData.consent = parsed.data.consent
    const confirmationId = await insertParticipantRegistration(parsed.data.eventId, submittedData)
    return NextResponse.json({ confirmationId }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Registration is temporarily unavailable.' }, { status: 503 })
  }
}
