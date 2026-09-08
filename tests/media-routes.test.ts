import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/server', () => ({
  requireVerifiedStaff: vi.fn(),
}))

vi.mock('@/lib/media/server', () => {
  class MockMediaPipelineError extends Error {
    status: 400 | 403 | 404 | 409 | 503
    code: string

    constructor(message: string, status: 400 | 403 | 404 | 409 | 503 = 503, code = 'media_pipeline_error') {
      super(message)
      this.status = status
      this.code = code
    }
  }
  return {
    MediaPipelineError: MockMediaPipelineError,
    parseMediaSignRequest: vi.fn(),
    signMediaUpload: vi.fn(),
    finalizeMediaUpload: vi.fn(),
    getMediaDelivery: vi.fn(),
    getPrivatePdfDelivery: vi.fn(),
  }
})

import { POST as signMedia } from '@/app/api/admin/media/sign/route'
import { POST as finalizeMedia } from '@/app/api/admin/media/finalize/route'
import { GET as deliverPrivateMedia } from '@/app/api/admin/media/[id]/route'
import { GET as deliverMedia } from '@/app/api/media/[id]/route'
import { requireVerifiedStaff } from '@/lib/auth/server'
import {
  finalizeMediaUpload,
  getMediaDelivery,
  getPrivatePdfDelivery,
  MediaPipelineError,
  parseMediaSignRequest,
  signMediaUpload,
} from '@/lib/media/server'

const mockedAuth = vi.mocked(requireVerifiedStaff)
const mockedParse = vi.mocked(parseMediaSignRequest)
const mockedSign = vi.mocked(signMediaUpload)
const mockedFinalize = vi.mocked(finalizeMediaUpload)
const mockedDelivery = vi.mocked(getMediaDelivery)
const mockedPrivateDelivery = vi.mocked(getPrivatePdfDelivery)
const staff = { ok: true as const, isStaff: true as const, user: { id: 'staff-1' } }
const mediaId = '11111111-1111-4111-8111-111111111111'

function jsonRequest(url: string, body: unknown) {
  return new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

describe('media authorization routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue(staff as never)
  })

  it.each([
    [{ ok: false, status: 401, code: 'unauthenticated', message: 'Sign in required.' }],
    [{ ok: false, status: 403, code: 'not_staff', message: 'Staff access required.' }],
  ] as const)('rejects sign requests before storage for auth result %j', async (failure) => {
    mockedAuth.mockResolvedValue(failure as never)
    const response = await signMedia(jsonRequest('http://localhost/api/admin/media/sign', {}))
    expect(response.status).toBe(failure.status)
    expect(mockedParse).not.toHaveBeenCalled()
    expect(mockedSign).not.toHaveBeenCalled()
  })

  it('lets verified staff sign after strict body validation', async () => {
    const parsed = { filename: 'poster.png', contentType: 'image/png', size: 12, policy: {}, displayName: 'poster.png' }
    mockedParse.mockReturnValue(parsed as never)
    mockedSign.mockResolvedValue({ media: { id: 'media-1' }, upload: { bucket: 'incoming-media', path: 'incoming/key', token: 'token' } } as never)
    const response = await signMedia(jsonRequest('http://localhost/api/admin/media/sign', parsed))
    expect(response.status).toBe(200)
    expect(mockedSign).toHaveBeenCalledWith(parsed, 'staff-1')
  })

  it('maps storage failures consistently and never turns them into success', async () => {
    mockedParse.mockImplementation(() => { throw new MediaPipelineError('storage unavailable', 503, 'storage_unavailable') })
    const response = await signMedia(jsonRequest('http://localhost/api/admin/media/sign', {}))
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: 'storage_unavailable' })
  })

  it('rejects malformed finalize ids and preserves staff identity binding', async () => {
    const malformed = await finalizeMedia(jsonRequest('http://localhost/api/admin/media/finalize', { mediaId: 'not-a-uuid' }))
    expect(malformed.status).toBe(400)
    expect(mockedFinalize).not.toHaveBeenCalled()

    mockedFinalize.mockResolvedValue({ media: { id: mediaId }, url: `/api/admin/media/${mediaId}` } as never)
    const validId = mediaId
    const response = await finalizeMedia(jsonRequest('http://localhost/api/admin/media/finalize', { mediaId: validId }))
    expect(response.status).toBe(200)
    expect(mockedFinalize).toHaveBeenCalledWith(validId, 'staff-1')
  })

  it('rejects pending, rejected, and private non-document delivery', async () => {
    for (const code of ['media_not_found', 'media_not_deliverable']) {
      mockedDelivery.mockRejectedValueOnce(new MediaPipelineError(code, 404, code))
      const response = await deliverMedia(new Request('http://localhost/api/media/11111111-1111-4111-8111-111111111111'), {
        params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }),
      })
      expect(response.status).toBe(404)
    }
  })

  it('redirects finalized public media while preserving private no-store caching', async () => {
    mockedDelivery.mockResolvedValue({ media: { id: 'media-1' }, url: 'https://project.supabase.co/storage/v1/object/public/public-media/final/key.webp' } as never)
    const response = await deliverMedia(new Request(`http://localhost/api/media/${mediaId}`), {
      params: Promise.resolve({ id: mediaId }),
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('project.supabase.co')
    expect(response.headers.get('location')).toContain('/object/public/public-media/')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('rejects anonymous and non-staff private document requests before delivery', async () => {
    for (const failure of [
      { ok: false as const, status: 401 as const, code: 'unauthenticated' as const, message: 'Sign in required.' },
      { ok: false as const, status: 403 as const, code: 'not_staff' as const, message: 'Staff access required.' },
    ]) {
      mockedAuth.mockResolvedValue(failure as never)
      const response = await deliverPrivateMedia(new Request(`http://localhost/api/admin/media/${mediaId}`), {
        params: Promise.resolve({ id: mediaId }),
      })
      expect(response.status).toBe(failure.status)
      expect(response.headers.get('location')).toBeNull()
      expect(mockedPrivateDelivery).not.toHaveBeenCalled()
    }
  })

  it('redirects verified staff to a finalized private PDF with no-store caching', async () => {
    mockedPrivateDelivery.mockResolvedValue({ media: { id: mediaId }, url: 'https://project.supabase.co/storage/v1/object/sign/private-documents/final/key.pdf' } as never)
    const response = await deliverPrivateMedia(new Request(`http://localhost/api/admin/media/${mediaId}`), {
      params: Promise.resolve({ id: mediaId }),
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/object/sign/private-documents/')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mockedPrivateDelivery).toHaveBeenCalledWith(mediaId)
  })
})
