import { contentErrorResponse } from '@/lib/admin-api'
import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { listParticipantRegistrations } from '@/lib/content-repository'
import { MAX_FORM_FIELDS, MAX_PARTICIPANT_ANSWER } from '@/lib/content-contracts'
import { jsonNoStore } from '@/lib/volunteer-api'

const eventIdPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/
const answerIdPattern = /^[a-z][a-z0-9_-]{0,31}$/

function normalizeAnswers(value: unknown): Record<string, string | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const answers: Record<string, string | boolean> = {}
  for (const [key, answer] of Object.entries(value)) {
    if (Object.keys(answers).length >= MAX_FORM_FIELDS) break
    if (!answerIdPattern.test(key)) continue
    if (typeof answer === 'boolean') answers[key] = answer
    else if (typeof answer === 'string') answers[key] = answer.slice(0, MAX_PARTICIPANT_ANSWER)
  }
  return answers
}

export async function GET(request: Request) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const eventId = new URL(request.url).searchParams.get('eventId')?.trim() ?? ''
  if (!eventIdPattern.test(eventId)) {
    return jsonNoStore({ error: 'A valid eventId is required.' }, 400)
  }

  try {
    const registrations = await listParticipantRegistrations(eventId)
    return jsonNoStore({
      registrations: registrations.map((registration) => ({
        confirmationId: String(registration.id ?? ''),
        eventId: String(registration.event_id ?? ''),
        createdAt: String(registration.created_at ?? ''),
        answers: normalizeAnswers(registration.submitted_data),
      })),
    })
  } catch (error) {
    const response = contentErrorResponse(error, 'Participant registrations could not be loaded.')
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }
}
