import { describe, expect, beforeEach, it } from 'vitest'

import { allowContactAttempt, resetContactAbuseForTests } from '@/lib/contact-abuse'
import { contactSubmissionSchema } from '@/lib/content-contracts'

describe('contact submission protection', () => {
  beforeEach(() => resetContactAbuseForTests())

  it('accepts bounded contact payloads but rejects unknown destinations and bot honeypots', () => {
    const valid = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'General',
      schoolName: '',
      studentCount: '',
      message: 'A question about an event.',
      honeypot: '',
    }
    expect(contactSubmissionSchema.safeParse(valid).success).toBe(true)
    expect(contactSubmissionSchema.safeParse({ ...valid, webhookUrl: 'https://evil.example' }).success).toBe(false)
    expect(contactSubmissionSchema.safeParse({ ...valid, honeypot: 'filled' }).success).toBe(false)
  })

  it('applies a deterministic bounded attempt window', () => {
    expect(Array.from({ length: 5 }, (_, index) => allowContactAttempt('client-a', index)).every(Boolean)).toBe(true)
    expect(allowContactAttempt('client-a', 5)).toBe(false)
    expect(allowContactAttempt('client-b', 5)).toBe(true)
    expect(allowContactAttempt('client-a', 10 * 60 * 1_000 + 1)).toBe(true)
  })
})
