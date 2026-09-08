import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  class MockContentRepositoryError extends Error {
    readonly status: 400 | 404 | 409 | 503

    constructor(message: string, status: 400 | 404 | 409 | 503 = 503) {
      super(message)
      this.status = status
    }
  }

  return {
    ContentRepositoryError: MockContentRepositoryError,
    getParticipantRegistrationContext: vi.fn(),
    insertParticipantRegistration: vi.fn(),
  }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/content-repository', () => ({
  ContentRepositoryError: mocks.ContentRepositoryError,
  getParticipantRegistrationContext: mocks.getParticipantRegistrationContext,
  insertParticipantRegistration: mocks.insertParticipantRegistration,
}))

import { POST } from '@/app/api/registrations/participant/route'

const form = {
  id: 'form-1',
  eventId: 'stem-night',
  kind: 'participant' as const,
  isActive: true,
  fields: [{ id: 'full_name', type: 'text' as const, label: 'Full name', required: true }],
}

function request(body: unknown): Request {
  return new Request('https://pillarsoftech.org/api/registrations/participant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('participant registration API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getParticipantRegistrationContext.mockResolvedValue({
      event: { publication_state: 'published', participant_registration_state: 'open' },
      form,
    })
    mocks.insertParticipantRegistration.mockResolvedValue('confirmation-1')
  })

  it('validates answers then sends exactly answers to the atomic repository operation', async () => {
    const response = await POST(request({ eventId: 'stem-night', answers: { full_name: 'Ada' }, honeypot: '' }))
    expect(response.status).toBe(201)
    expect(mocks.insertParticipantRegistration).toHaveBeenCalledWith('stem-night', { full_name: 'Ada' })
  })

  it.each([
    [new mocks.ContentRepositoryError('database detail', 404), 404],
    [new mocks.ContentRepositoryError('database detail', 409), 409],
  ] as const)('preserves safe registration status without database detail', async (error, status) => {
    mocks.insertParticipantRegistration.mockRejectedValue(error)
    const response = await POST(request({ eventId: 'stem-night', answers: { full_name: 'Ada' }, honeypot: '' }))
    expect(response.status).toBe(status)
    expect(await response.text()).not.toContain('database detail')
  })

  it('maps invalid repository answers to a safe 400 and unexpected failures to 503', async () => {
    mocks.insertParticipantRegistration.mockRejectedValueOnce(new mocks.ContentRepositoryError('database detail', 400))
    const invalid = await POST(request({ eventId: 'stem-night', answers: { full_name: 'Ada' }, honeypot: '' }))
    expect(invalid.status).toBe(400)
    expect(await invalid.text()).not.toContain('database detail')

    mocks.insertParticipantRegistration.mockRejectedValueOnce(new Error('raw database detail'))
    const unavailable = await POST(request({ eventId: 'stem-night', answers: { full_name: 'Ada' }, honeypot: '' }))
    expect(unavailable.status).toBe(503)
    expect(await unavailable.text()).not.toContain('raw database detail')
  })

  it('rejects envelope consent/unknown properties before repository access', async () => {
    const response = await POST(request({
      eventId: 'stem-night',
      answers: { full_name: 'Ada' },
      consent: true,
      honeypot: '',
    }))
    expect(response.status).toBe(400)
    expect(mocks.getParticipantRegistrationContext).not.toHaveBeenCalled()
    expect(mocks.insertParticipantRegistration).not.toHaveBeenCalled()
  })
})
