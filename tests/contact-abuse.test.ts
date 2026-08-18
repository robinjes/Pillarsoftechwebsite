import { describe, expect, beforeEach, it } from 'vitest'

import {
  allowContactAttempt,
  CONTACT_ABUSE_MAX_IDENTITIES,
  CONTACT_ABUSE_MAX_IDENTITY_LENGTH,
  normalizeContactIdentity,
  resetContactAbuseForTests,
} from '@/lib/contact-abuse'
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

  it('normalizes and bounds identities while pruning the global map', () => {
    const normalized = normalizeContactIdentity('  EXAMPLE\u0000.CLIENT\t')
    expect(normalized).toBe('example.client')
    expect(normalizeContactIdentity('x'.repeat(CONTACT_ABUSE_MAX_IDENTITY_LENGTH + 20))).toHaveLength(CONTACT_ABUSE_MAX_IDENTITY_LENGTH)

    for (let index = 0; index <= CONTACT_ABUSE_MAX_IDENTITIES; index += 1) {
      expect(allowContactAttempt(`identity-${index}`, index)).toBe(true)
    }
    // The oldest identity was evicted once the global bound was reached.
    expect(allowContactAttempt('identity-0', CONTACT_ABUSE_MAX_IDENTITIES + 1)).toBe(true)
  })
})
