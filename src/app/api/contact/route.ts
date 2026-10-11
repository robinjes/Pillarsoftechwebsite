import { verifyContactCaptcha } from '@/lib/contact-captcha'
import { readJson } from '@/lib/admin-api'
import { contactSubmissionSchema } from '@/lib/content-contracts'
import { allowContactAttemptDurably } from '@/lib/contact-rate-limit'
import { insertContactSubmission } from '@/lib/content-repository'
import { getRequestIdentity } from '@/lib/request-identity'
import { sameOrigin, sameOriginFailure, jsonNoStore } from '@/lib/volunteer-api'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return sameOriginFailure()

  const parsed = contactSubmissionSchema.safeParse(await readJson(request))
  if (!parsed.success) return jsonNoStore({ error: 'Invalid contact body.', issues: parsed.error.issues }, 400)
  if (parsed.data.honeypot !== '') return jsonNoStore({ error: 'Invalid submission.' }, 400)

  try {
    if (!await allowContactAttemptDurably(getRequestIdentity(request))) {
      return jsonNoStore({ error: 'Too many contact attempts. Try again later.' }, 429)
    }
  } catch {
    // Missing CHAT_TOKEN_PEPPER and every limiter/database failure deliberately
    // look the same to callers. Contact must never bypass durable protection.
    return jsonNoStore({ error: 'Contact submissions are temporarily unavailable.' }, 503)
  }

  try {
    if (!await verifyContactCaptcha(parsed.data.captchaToken)) {
      return jsonNoStore({ error: 'Please complete the CAPTCHA again before sending.' }, 400)
    }
  } catch {
    return jsonNoStore({ error: 'CAPTCHA verification is temporarily unavailable. Please try again or email us directly.' }, 503)
  }

  try {
    await insertContactSubmission({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
      subject: parsed.data.subject,
      schoolName: parsed.data.schoolName,
      studentCount: parsed.data.studentCount,
    })
    return jsonNoStore({ accepted: true }, 202)
  } catch {
    return jsonNoStore({ error: 'Contact submissions are temporarily unavailable.' }, 503)
  }
}
