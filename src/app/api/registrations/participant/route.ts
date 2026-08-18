import { NextResponse } from 'next/server'

import { readJson } from '@/lib/admin-api'
import { participantSubmissionSchema, validateParticipantAnswers } from '@/lib/content-contracts'
import {
  ContentRepositoryError,
  getParticipantRegistrationContext,
  insertParticipantRegistration,
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

    // The RPC repeats publication/form/state checks and locks the event row;
    // this preflight only supplies the active form needed for answer validation.
    const confirmationId = await insertParticipantRegistration(parsed.data.eventId, parsed.data.answers)
    return NextResponse.json({ confirmationId }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof ContentRepositoryError && (error.status === 400 || error.status === 404 || error.status === 409)) {
      const message = error.status === 400
        ? 'Invalid registration answers.'
        : error.status === 404
        ? 'Event registration is unavailable.'
        : 'Registration is closed or full.'
      return NextResponse.json({ error: message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Registration is temporarily unavailable.' }, { status: 503 })
  }
}
