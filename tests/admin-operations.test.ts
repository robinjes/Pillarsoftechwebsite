import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: vi.fn() }))
vi.mock('@/lib/content-repository', () => ({ listParticipantRegistrations: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))

import { GET as participantRegistrations } from '@/app/api/admin/registrations/participants/route'
import { GET as contactInbox } from '@/app/api/admin/contact/route'
import { requireVerifiedStaff } from '@/lib/auth/server'
import { listParticipantRegistrations } from '@/lib/content-repository'
import { MAX_CONTACT_MESSAGE, MAX_FORM_FIELDS, MAX_PARTICIPANT_ANSWER } from '@/lib/content-contracts'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const mockedAuth = vi.mocked(requireVerifiedStaff)
const mockedListParticipantRegistrations = vi.mocked(listParticipantRegistrations)
const mockedCreateServerClient = vi.mocked(createSupabaseServerClient)
const staff = { ok: true as const, isStaff: true as const, user: { id: 'staff-1' } }

const source = (relativePath: string) => readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

describe('admin operations API boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue(staff as never)
  })

  it.each([
    { ok: false as const, status: 401 as const, code: 'unauthenticated' as const, message: 'A verified sign-in is required.' },
    { ok: false as const, status: 403 as const, code: 'not_staff' as const, message: 'This account is not authorized for staff access.' },
  ])('protects participant registration reads for $code', async (failure) => {
    mockedAuth.mockResolvedValue(failure as never)
    const response = await participantRegistrations(new Request('https://pillarsoftech.org/api/admin/registrations/participants?eventId=stem-night'))
    expect(response.status).toBe(failure.status)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(mockedListParticipantRegistrations).not.toHaveBeenCalled()
  })

  it('strictly validates participant event IDs and returns only bounded registration fields', async () => {
    const invalid = await participantRegistrations(new Request('https://pillarsoftech.org/api/admin/registrations/participants?eventId=https%3A%2F%2Fevil.example'))
    expect(invalid.status).toBe(400)
    expect(invalid.headers.get('cache-control')).toContain('no-store')
    expect(mockedListParticipantRegistrations).not.toHaveBeenCalled()

    mockedListParticipantRegistrations.mockResolvedValue([{
      id: 'confirmation-1',
      event_id: 'stem-night',
      submitted_data: { full_name: 'Ada Lovelace' },
      created_at: '2026-08-21T12:00:00.000Z',
      internal_note: 'must not escape',
    }])
    const response = await participantRegistrations(new Request('https://pillarsoftech.org/api/admin/registrations/participants?eventId=stem-night'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(mockedListParticipantRegistrations).toHaveBeenCalledWith('stem-night')
    expect(await response.json()).toEqual({
      registrations: [{
        confirmationId: 'confirmation-1',
        eventId: 'stem-night',
        createdAt: '2026-08-21T12:00:00.000Z',
        answers: { full_name: 'Ada Lovelace' },
      }],
    })
  })

  it('drops dirty nested answers, caps answer strings, and bounds answer count', async () => {
    const submittedData = {
      full_name: 'x'.repeat(MAX_PARTICIPANT_ANSWER + 20),
      consent: true,
      nested_answer: { value: 'do not expose' },
      array_answer: ['do not expose'],
      null_answer: null,
      numeric_answer: 42,
      'unsafe.key': 'do not expose',
      ...Object.fromEntries(Array.from({ length: MAX_FORM_FIELDS }, (_, index) => [`field_${index}`, `value_${index}`])),
    }
    mockedListParticipantRegistrations.mockResolvedValue([{
      id: 'confirmation-dirty',
      event_id: 'stem-night',
      submitted_data: submittedData,
      created_at: '2026-08-21T12:00:00.000Z',
    }])

    const response = await participantRegistrations(new Request('https://pillarsoftech.org/api/admin/registrations/participants?eventId=stem-night'))
    const answers = (await response.json()).registrations[0].answers as Record<string, unknown>
    expect(answers.full_name).toBe('x'.repeat(MAX_PARTICIPANT_ANSWER))
    expect(answers.consent).toBe(true)
    expect(answers.nested_answer).toBeUndefined()
    expect(answers.array_answer).toBeUndefined()
    expect(answers.null_answer).toBeUndefined()
    expect(answers.numeric_answer).toBeUndefined()
    expect(answers['unsafe.key']).toBeUndefined()
    expect(Object.keys(answers)).toHaveLength(MAX_FORM_FIELDS)
    expect(answers.field_0).toBe('value_0')
    expect(answers[`field_${MAX_FORM_FIELDS - 3}`]).toBeDefined()
    expect(answers[`field_${MAX_FORM_FIELDS - 2}`]).toBeUndefined()
  })

  it.each([
    { ok: false as const, status: 401 as const, code: 'unauthenticated' as const, message: 'A verified sign-in is required.' },
    { ok: false as const, status: 403 as const, code: 'not_staff' as const, message: 'This account is not authorized for staff access.' },
  ])('protects contact inbox reads for $code', async (failure) => {
    mockedAuth.mockResolvedValue(failure as never)
    const response = await contactInbox()
    expect(response.status).toBe(failure.status)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
  })

  it('uses the authenticated Supabase client and RLS-shaped bounded contact projection', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{
        id: 'contact-1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        subject: 'Workshop',
        message: 'Hello',
        school_name: 'Analytical Engines Academy',
        student_count: '12',
        status: 'new',
        created_at: '2026-08-21T12:00:00.000Z',
        updated_at: '2026-08-21T12:00:00.000Z',
        service_secret: 'must not escape',
      }],
      error: null,
    })
    const select = vi.fn(() => ({ order }))
    const from = vi.fn(() => ({ select }))
    mockedCreateServerClient.mockResolvedValue({ from } as never)

    const response = await contactInbox()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(from).toHaveBeenCalledWith('contact_submissions')
    expect(select).toHaveBeenCalledWith('id,name,email,subject,message,school_name,student_count,status,created_at,updated_at')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(await response.json()).toEqual({
      submissions: [{
        id: 'contact-1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        subject: 'Workshop',
        message: 'Hello',
        schoolName: 'Analytical Engines Academy',
        studentCount: '12',
        status: 'new',
        createdAt: '2026-08-21T12:00:00.000Z',
        updatedAt: '2026-08-21T12:00:00.000Z',
      }],
    })
  })

  it('caps dirty contact strings before they reach the inbox UI', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{
        id: 'contact-1',
        name: 'n'.repeat(200),
        email: 'e'.repeat(400),
        subject: 's'.repeat(300),
        message: 'm'.repeat(MAX_CONTACT_MESSAGE + 100),
        school_name: 's'.repeat(300),
        student_count: 'c'.repeat(100),
        status: 'status'.repeat(20),
        created_at: 't'.repeat(100),
        updated_at: 'u'.repeat(100),
      }],
      error: null,
    })
    const select = vi.fn(() => ({ order }))
    const from = vi.fn(() => ({ select }))
    mockedCreateServerClient.mockResolvedValue({ from } as never)

    const response = await contactInbox()
    const submission = (await response.json()).submissions[0] as Record<string, string>
    expect(submission.name).toHaveLength(160)
    expect(submission.email).toHaveLength(320)
    expect(submission.subject).toHaveLength(240)
    expect(submission.message).toHaveLength(MAX_CONTACT_MESSAGE)
    expect(submission.schoolName).toHaveLength(240)
    expect(submission.studentCount).toHaveLength(80)
    expect(submission.status).toHaveLength(32)
    expect(submission.createdAt).toHaveLength(64)
    expect(submission.updatedAt).toHaveLength(64)
  })
})

describe('admin operations UI surfaces', () => {
  it('adds protected navigation and usable registration, impact, and inbox surfaces', () => {
    const shell = source('src/app/(admin-protected)/admin/AdminShell.tsx')
    const registrations = source('src/app/(admin-protected)/admin/registrations/page.tsx')
    const impact = source('src/app/(admin-protected)/admin/impact/page.tsx')
    const contact = source('src/app/(admin-protected)/admin/contact/page.tsx')

    for (const route of ["{ name: 'Registrations', href: '/admin/registrations'", "{ name: 'Impact', href: '/admin/impact'", "{ name: 'Inbox', href: '/admin/contact'"]) {
      expect(shell).toContain(route)
    }
    expect(shell).toContain('xl:flex')
    expect(shell).toContain('xl:hidden')
    expect(shell).toContain('hidden xl:block')
    expect(shell).not.toContain('lg:flex')
    expect(shell).not.toContain('lg:hidden')
    expect(registrations).toContain("/api/admin/registrations/participants?eventId=")
    expect(registrations).toContain('/api/admin/exports/participant-registrations?eventId=')
    expect(registrations).toContain('Search registrations')
    expect(registrations).toContain('fieldLabels.get(key)')
    for (const field of ['Metric key', 'Numeric value', 'Unit', 'Public label', 'Evidence date', 'Evidence URL', 'Methodology', 'Approval state', 'Display order']) {
      expect(impact).toContain(field)
    }
    expect(impact).toContain('approvalRequirementsMissing')
    expect(impact).toContain("fetch('/api/admin/impact'")
    expect(contact).toContain("fetch('/api/admin/contact'")
    expect(contact).toContain('mailto:')
    expect(contact).toContain('Search messages')
    expect(contact).toContain('Status')
  })
})
