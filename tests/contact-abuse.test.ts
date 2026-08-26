import { describe, expect, beforeEach, it, vi } from 'vitest'

import {
  CONTACT_ABUSE_MAX_IDENTITY_LENGTH,
  normalizeContactIdentity,
  hashContactIdentity,
} from '@/lib/contact-abuse'
import { contactSubmissionSchema } from '@/lib/content-contracts'

describe('contact submission protection', () => {
  beforeEach(() => vi.stubEnv('CHAT_TOKEN_PEPPER', 'test-pepper'))

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

  it('normalizes and bounds identities before hashing', () => {
    const normalized = normalizeContactIdentity('  EXAMPLE\u0000.CLIENT\t')
    expect(normalized).toBe('example.client')
    expect(normalizeContactIdentity('x'.repeat(CONTACT_ABUSE_MAX_IDENTITY_LENGTH + 20))).toHaveLength(CONTACT_ABUSE_MAX_IDENTITY_LENGTH)
    expect(hashContactIdentity('  EXAMPLE\u0000.CLIENT\t')).toBe(hashContactIdentity('example.client'))
    expect(hashContactIdentity('example.client')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashContactIdentity('example.client')).not.toContain('example.client')
  })
})
