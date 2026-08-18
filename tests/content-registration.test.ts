import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  eventWriteSchema,
  formSchema,
  impactMetricSchema,
  isApprovedResourceUrl,
  participantSubmissionSchema,
  publicImpactMetricSchema,
  toCsv,
  validateParticipantAnswers,
  type FormDefinition,
} from '@/lib/content-contracts'
import { getPublicEventSnapshot } from '@/lib/event-snapshot'

const validEvent = {
  title: 'STEM Night',
  summary: 'A safe summary',
  description: 'A longer description',
  startsAt: null,
  endsAt: null,
  timezone: 'America/New_York',
  startLabel: 'May 13, 2026',
  endLabel: '6:00 PM',
  location: 'School',
  programCategory: 'general',
  status: 'upcoming' as const,
  media: { image: '/images/events/cover.png', gallery: [], youtubeVideos: [] },
  resources: {},
  participantRegistrationState: 'open' as const,
  volunteerRegistrationState: 'closed' as const,
  participantCapacity: null,
  volunteerCapacity: null,
  outcomes: {},
  publicationState: 'unpublished' as const,
}

const validForm: FormDefinition = {
  id: '00000000-0000-0000-0000-000000000001',
  eventId: 'stem-night',
  kind: 'participant',
  isActive: true,
  fields: [
    { id: 'full_name', type: 'text', label: 'Full name', required: true },
    { id: 'email', type: 'email', label: 'Email', required: true },
    { id: 'consent', type: 'checkbox', label: 'I consent', required: true, consent: true },
  ],
}

describe('Task 03 content contracts', () => {
  it('rejects unknown event mutation fields and arbitrary resource origins', () => {
    expect(eventWriteSchema.safeParse({ ...validEvent, unexpected: true }).success).toBe(false)
    expect(eventWriteSchema.safeParse({ ...validEvent, status: 'draft', publicationState: 'published' }).success).toBe(false)
    expect(isApprovedResourceUrl('https://evil.example/asset.png')).toBe(false)
    expect(isApprovedResourceUrl('javascript:alert(1)')).toBe(false)
    expect(isApprovedResourceUrl('data:text/html,hello')).toBe(false)
    expect(isApprovedResourceUrl('//evil.example/asset.png')).toBe(false)
    expect(isApprovedResourceUrl('https://user:password@hcb.hackclub.com/file')).toBe(false)
    expect(isApprovedResourceUrl('http://localhost:3000/file')).toBe(false)
    expect(isApprovedResourceUrl('/uploads/reviewed.png')).toBe(true)
    expect(isApprovedResourceUrl('https://docs.google.com/forms/d/e/example/viewform')).toBe(true)
  })

  it('bounds form fields, rejects destinations, and requires unique IDs', () => {
    expect(formSchema.safeParse({ ...validForm, fields: [{ ...validForm.fields[0], destination: 'https://evil.example' }] }).success).toBe(false)
    expect(formSchema.safeParse({ ...validForm, fields: [validForm.fields[0], validForm.fields[0]] }).success).toBe(false)
    expect(formSchema.safeParse({ ...validForm, fields: [{ ...validForm.fields[0], type: 'select' }] }).success).toBe(false)
  })

  it('requires approval evidence for impact metrics and keeps public projection narrow', () => {
    const pending = {
      key: 'students_reached',
      value: 10,
      unit: 'students',
      publicLabel: 'Students reached',
      asOf: null,
      sourceUrl: '',
      methodologyNote: '',
      approvalStatus: 'pending' as const,
      displayOrder: 1,
    }
    expect(impactMetricSchema.safeParse(pending).success).toBe(true)
    expect(impactMetricSchema.safeParse({ ...pending, approvalStatus: 'approved' }).success).toBe(false)
    const approved = { ...pending, asOf: '2026-08-18', sourceUrl: '/docs/impact-methodology', methodologyNote: 'Reviewed method', approvalStatus: 'approved' as const }
    expect(impactMetricSchema.safeParse(approved).success).toBe(true)
    expect(publicImpactMetricSchema.safeParse({ ...approved, auditUser: 'secret' }).success).toBe(false)
    const publicApproved = {
      key: approved.key,
      value: approved.value,
      unit: approved.unit,
      publicLabel: approved.publicLabel,
      asOf: approved.asOf,
      sourceUrl: approved.sourceUrl,
      methodologyNote: approved.methodologyNote,
      displayOrder: approved.displayOrder,
    }
    expect(publicImpactMetricSchema.safeParse(publicApproved).success).toBe(true)
  })

  it('requires exact participant answer keys/types and rejects caller destinations', () => {
    const base = { eventId: validForm.eventId, answers: { full_name: 'Ada', email: 'ada@example.com', consent: true }, honeypot: '' }
    expect(participantSubmissionSchema.safeParse({ ...base, destination: 'https://evil.example' }).success).toBe(false)
    expect(participantSubmissionSchema.safeParse({ ...base, consent: true }).success).toBe(false)
    expect(participantSubmissionSchema.safeParse({ ...base, unexpected: true }).success).toBe(false)
    expect(participantSubmissionSchema.safeParse({ ...base, answers: { ...base.answers, 'unsafe.field': 'nope' } }).success).toBe(false)
    expect(participantSubmissionSchema.safeParse({
      ...base,
      answers: Object.fromEntries(Array.from({ length: 41 }, (_, index) => [`field_${index}`, 'value'])),
    }).success).toBe(false)
    expect(validateParticipantAnswers(validForm, participantSubmissionSchema.parse(base))).toEqual([])
    const optionalForm: FormDefinition = {
      ...validForm,
      fields: [...validForm.fields, { id: 'nickname', type: 'text', label: 'Nickname', required: false }],
    }
    expect(validateParticipantAnswers(optionalForm, participantSubmissionSchema.parse({
      ...base,
      answers: { full_name: 'Ada', email: 'ada@example.com', consent: true },
    }))).toEqual([])
    expect(validateParticipantAnswers(validForm, participantSubmissionSchema.parse({ ...base, answers: { full_name: 'Ada', email: 'ada@example.com' } }))).toContain('Missing answer: consent')
    expect(validateParticipantAnswers(validForm, participantSubmissionSchema.parse({ ...base, answers: { full_name: 'Ada', email: 'ada@example.com', consent: 'yes' } as never }))).toContain('Checkbox answer must be boolean: consent')
    expect(participantSubmissionSchema.safeParse({ ...base, honeypot: 'bot' }).success).toBe(false)
  })

  it('uses safe CSV escaping and formula neutralization', () => {
    const csv = toCsv([
      { name: '=SUM(A1:A2)', note: 'quoted, value', message: 'line one\nline two' },
      { name: '+cmd', note: '@mention', message: '-not-a-formula' },
      { name: '\t=SUM(A1:A2)', note: ' \u0000@cmd', message: '\n-unsafe' },
    ], ['name', 'note', 'message'])
    expect(csv).toContain("'=SUM(A1:A2)")
    expect(csv).toContain("'+cmd")
    expect(csv).toContain("'@mention")
    expect(csv).toContain("'-not-a-formula")
    expect(csv).toContain("'\t=SUM(A1:A2)")
    expect(csv).toContain("' \u0000@cmd")
    expect(csv).toContain("'\n-unsafe")
    expect(csv).toContain('"quoted, value"')
    expect(csv).toContain('"line one\nline two"')
  })

  it('normalizes the checked-in snapshot as published safe content without legacy outcome stats', () => {
    const events = getPublicEventSnapshot()
    expect(events.length).toBeGreaterThan(0)
    expect(events.some((event) => event.status === 'completed')).toBe(true)
    for (const event of events) {
      expect(event).not.toHaveProperty('stats')
      expect(event).not.toHaveProperty('publicationState')
      expect(event).not.toHaveProperty('participantCapacity')
      expect(event).not.toHaveProperty('outcomes')
    }
  })

  it('keeps production content mutation off local JSON and public-disk writers', () => {
    const sourceRoot = join(process.cwd(), 'src')
    const files: string[] = []
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const fullPath = join(directory, entry.name)
        if (entry.isDirectory()) walk(fullPath)
        else if (/\.(ts|tsx)$/.test(entry.name)) files.push(fullPath)
      }
    }
    walk(sourceRoot)
    const source = files.map((file) => readFileSync(file, 'utf8')).join('\n')
    expect(source).not.toMatch(/writeFileSync|writeFile\s*\(/)
    expect(source).not.toContain('@emailjs/browser')
    expect(source).not.toContain('/api/settings')
    expect(source).not.toContain('script.google.com')
  })

  it('keeps public repository reads on a cookie-free anonymous client', () => {
    const repository = readFileSync(join(process.cwd(), 'src/lib/content-repository.ts'), 'utf8')
    const publicClient = readFileSync(join(process.cwd(), 'src/lib/supabase/public.ts'), 'utf8')
    expect(repository).toContain("createSupabasePublicClient")
    expect(repository).not.toContain("createSupabaseServerClient")
    expect(publicClient).toContain('persistSession: false')
    expect(publicClient).toContain('autoRefreshToken: false')
    expect(publicClient).not.toContain("from 'next/headers'")
  })

  it('keeps repository error messages safe for API responses', () => {
    const repository = readFileSync(join(process.cwd(), 'src/lib/content-repository.ts'), 'utf8')
    expect(repository).toContain('safeRepositoryMessage')
    expect(repository).not.toContain('error.message ||')
  })

  it('bounds import local paths against traversal and encoded-dot variants', () => {
    const importer = readFileSync(join(process.cwd(), 'scripts/import-content.mjs'), 'utf8')
    expect(importer).toContain("!value.split('/').includes('..')")
    expect(importer).toContain("!/%2e/i.test(value)")
    expect(importer).toContain("!/[\\u0000-\\u001f\\u007f]/.test(value)")
    expect(importer).toContain("!value.includes('\\\\')")
  })
})
