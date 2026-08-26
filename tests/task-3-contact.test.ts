import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement, type AnchorHTMLAttributes, type ImgHTMLAttributes, type ReactNode } from 'react'

const {
  allowContactAttemptDurablyMock,
  insertContactSubmissionMock,
  requireVerifiedStaffMock,
  listAdminContactMock,
  updateAdminContactStatusMock,
} = vi.hoisted(() => ({
  allowContactAttemptDurablyMock: vi.fn(),
  insertContactSubmissionMock: vi.fn(),
  requireVerifiedStaffMock: vi.fn(),
  listAdminContactMock: vi.fn(),
  updateAdminContactStatusMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/contact-rate-limit', () => ({ allowContactAttemptDurably: allowContactAttemptDurablyMock }))
vi.mock('@/lib/content-repository', () => ({
  insertContactSubmission: insertContactSubmissionMock,
  listAdminContact: listAdminContactMock,
  updateAdminContactStatus: updateAdminContactStatusMock,
}))
vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: requireVerifiedStaffMock }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock('next/link', () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) => createElement('a', props, children),
}))
vi.mock('next/image', () => ({
  default: ({ fill, priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => createElement('img', { ...props, alt: props.alt ?? '', 'data-next-fill': fill ? 'true' : undefined, 'data-next-priority': priority ? 'true' : undefined }),
}))

import { PATCH as updateContact, GET as listContact } from '@/app/api/admin/contact/route'
import { POST as postContact } from '@/app/api/contact/route'
import { contactSubmissionSchema } from '@/lib/content-contracts'
import { decodeContactCursor, encodeContactCursor } from '@/lib/contact-pagination'
import { hashContactIdentity } from '@/lib/contact-abuse'
import Contact from '@/components/Contact'

const staff = { ok: true as const, isStaff: true as const, user: { id: 'staff-1' } }
const submission = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'General inquiry',
  schoolName: '',
  studentCount: '',
  message: 'A question.',
  status: 'new' as const,
  createdAt: '2026-08-26T12:00:00.000Z',
  updatedAt: '2026-08-26T12:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CHAT_TOKEN_PEPPER', 'test-pepper')
  requireVerifiedStaffMock.mockResolvedValue(staff)
  allowContactAttemptDurablyMock.mockResolvedValue(true)
  insertContactSubmissionMock.mockResolvedValue(undefined)
  listAdminContactMock.mockResolvedValue({ submissions: [submission], nextCursor: null })
  updateAdminContactStatusMock.mockResolvedValue({ ...submission, status: 'resolved' })
})

afterEach(() => cleanup())

describe('Task 3 contact contracts and privacy boundaries', () => {
  it('keeps the public payload strict and requires email', () => {
    const valid = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'General inquiry',
      schoolName: '',
      studentCount: '',
      message: 'A question.',
      honeypot: '',
    }
    expect(contactSubmissionSchema.safeParse(valid).success).toBe(true)
    expect(contactSubmissionSchema.safeParse({ ...valid, email: '' }).success).toBe(false)
    expect(contactSubmissionSchema.safeParse({ ...valid, destination: 'https://evil.example' }).success).toBe(false)
    expect(contactSubmissionSchema.safeParse({ ...valid, honeypot: 'bot' }).success).toBe(false)
  })

  it('uses a deterministic HMAC digest and opaque keyset cursors', () => {
    expect(hashContactIdentity('  CLIENT\u0000-A ')).toBe(hashContactIdentity('client-a'))
    expect(hashContactIdentity('client-a')).not.toContain('client-a')

    const cursor = encodeContactCursor(submission.createdAt, submission.id)
    expect(decodeContactCursor(cursor)).toEqual({ createdAt: submission.createdAt, id: submission.id })
    expect(decodeContactCursor(`${cursor}!`)).toBeNull()
  })
})

describe('contact API boundaries', () => {
  it('rejects an explicit cross-origin request before body parsing or limiting', async () => {
    const response = await postContact(new Request('https://pillarsoftech.org/api/contact', {
      method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: 'not-json',
    }))

    expect(response.status).toBe(403)
    expect(allowContactAttemptDurablyMock).not.toHaveBeenCalled()
    expect(insertContactSubmissionMock).not.toHaveBeenCalled()
  })

  it('fails closed and redacts limiter errors', async () => {
    allowContactAttemptDurablyMock.mockRejectedValueOnce(new Error('postgres password and request IP'))
    const response = await postContact(new Request('https://pillarsoftech.org/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ada Lovelace', email: 'ada@example.com', subject: 'General inquiry',
        schoolName: '', studentCount: '', message: 'A question.', honeypot: '',
      }),
    }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Contact submissions are temporarily unavailable.' })
    expect(insertContactSubmissionMock).not.toHaveBeenCalled()
  })

  it('accepts through the durable limiter before inserting privately', async () => {
    const response = await postContact(new Request('https://pillarsoftech.org/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
      body: JSON.stringify({
        name: 'Ada Lovelace', email: 'ada@example.com', subject: 'General inquiry',
        schoolName: '', studentCount: '', message: 'A question.', honeypot: '',
      }),
    }))

    expect(response.status).toBe(202)
    expect(allowContactAttemptDurablyMock).toHaveBeenCalledWith('203.0.113.10')
    expect(insertContactSubmissionMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'ada@example.com' }))
  })
})

describe('protected contact inbox API', () => {
  it('requires verified staff and supports bounded listing/status changes', async () => {
    const listResponse = await listContact(new Request('https://pillarsoftech.org/api/admin/contact?limit=1'))
    expect(listResponse.status).toBe(200)
    expect(listAdminContactMock).toHaveBeenCalledWith({ limit: 1 })

    const updateResponse = await updateContact(new Request('https://pillarsoftech.org/api/admin/contact', {
      method: 'PATCH',
      headers: { Origin: 'https://pillarsoftech.org', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.id, status: 'resolved' }),
    }))
    expect(updateResponse.status).toBe(200)
    expect(updateAdminContactStatusMock).toHaveBeenCalledWith(submission.id, 'resolved')
  })

  it('does not allow a non-staff account or cross-origin status mutation', async () => {
    requireVerifiedStaffMock.mockResolvedValueOnce({ ok: false, code: 'not_staff', status: 403, message: 'no' })
    const denied = await listContact(new Request('https://pillarsoftech.org/api/admin/contact'))
    expect(denied.status).toBe(403)
    expect(listAdminContactMock).not.toHaveBeenCalled()

    const crossOrigin = await updateContact(new Request('https://pillarsoftech.org/api/admin/contact', {
      method: 'PATCH',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: 'not-json',
    }))
    expect(crossOrigin.status).toBe(403)
    expect(updateAdminContactStatusMock).not.toHaveBeenCalled()
  })
})

describe('contact surfaces', () => {
  it('opens and focuses the protected email form from the Email us card', () => {
    render(createElement(Contact))
    const nameInput = screen.getByLabelText('Name')
    fireEvent.click(screen.getByRole('button', { name: 'Open email form' }))
    expect(nameInput).toHaveFocus()
  })

  it('contains both equal contact choices and the protected-form fallback', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'src/components/Contact.tsx'), 'utf8')
    const adminSource = readFileSync(path.resolve(process.cwd(), 'src/app/(admin-protected)/admin/contact/page.tsx'), 'utf8')
    expect(source).toContain('Live chat with us')
    expect(source).toContain('Email us')
    expect(source).toContain('Monday–Friday, 4:00–10:00 PM Pacific')
    expect(source).toContain('pillarsoftech@gmail.com')
    expect(source).toContain('focusMessageForm')
    expect(adminSource).toContain("/api/admin/contact")
    for (const status of ['new', 'in_progress', 'resolved', 'spam']) expect(adminSource).toContain(`value: '${status}'`)
  })
})
