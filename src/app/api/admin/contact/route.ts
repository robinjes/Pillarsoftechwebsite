import { authFailureResponse } from '@/lib/auth/http'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { MAX_CONTACT_MESSAGE } from '@/lib/content-contracts'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { jsonNoStore } from '@/lib/volunteer-api'

const CONTACT_ID_MAX = 128
const CONTACT_STATUS_MAX = 32
const CONTACT_TIMESTAMP_MAX = 64

function boundedText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}

export async function GET() {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return authFailureResponse(auth)

  const client = await createSupabaseServerClient()
  if (!client) return jsonNoStore({ error: 'configuration_unavailable', message: 'Contact inbox is not configured.' }, 503)

  try {
    const { data, error } = await client
      .from('contact_submissions')
      .select('id,name,email,subject,message,school_name,student_count,status,created_at,updated_at')
      .order('created_at', { ascending: false })

    if (error) return jsonNoStore({ error: 'service_unavailable', message: 'Contact inbox is temporarily unavailable.' }, 503)

    return jsonNoStore({
      submissions: (data ?? []).map((submission) => ({
        id: boundedText(submission.id, CONTACT_ID_MAX),
        name: boundedText(submission.name, 160),
        email: boundedText(submission.email, 320),
        subject: boundedText(submission.subject, 240),
        message: boundedText(submission.message, MAX_CONTACT_MESSAGE),
        schoolName: boundedText(submission.school_name, 240),
        studentCount: boundedText(submission.student_count, 80),
        status: boundedText(submission.status ?? 'new', CONTACT_STATUS_MAX),
        createdAt: boundedText(submission.created_at, CONTACT_TIMESTAMP_MAX),
        updatedAt: boundedText(submission.updated_at, CONTACT_TIMESTAMP_MAX),
      })),
    })
  } catch {
    return jsonNoStore({ error: 'service_unavailable', message: 'Contact inbox is temporarily unavailable.' }, 503)
  }
}
