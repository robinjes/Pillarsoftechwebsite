import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/service', () => ({ createSupabaseServiceRoleClient: vi.fn() }))

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'
import {
  finalizeMediaUpload,
  parseMediaSignRequest,
  signMediaUpload,
} from '@/lib/media/server'
import { SAMPLE_MAX_BYTES } from '@/lib/media/policy'

const mockedServiceClient = vi.mocked(createSupabaseServiceRoleClient)

function pendingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    storage_path: 'incoming/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg',
    original_filename: 'poster.jpg',
    content_type: 'image/jpeg',
    byte_size: 4,
    visibility: 'public',
    status: 'incoming',
    metadata: {},
    created_by: 'staff-1',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function selectQuery(result: unknown, error: unknown = null) {
  const query: Record<string, (...args: unknown[]) => unknown> = {}
  query.select = () => query
  query.eq = () => query
  query.in = () => query
  query.lt = () => query
  query.order = () => query
  query.limit = async () => ({ data: Array.isArray(result) ? result : [], error })
  query.maybeSingle = async () => ({ data: result, error })
  return query
}

function updateQuery(result: unknown = null, error: unknown = null) {
  const query: Record<string, (...args: unknown[]) => unknown> = {}
  query.update = vi.fn(() => query)
  query.eq = () => query
  query.select = () => query
  query.maybeSingle = async () => ({ data: result, error })
  return query
}

describe('server media ownership and finalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts the owner-bound pending row before requesting an upload token', async () => {
    const order: string[] = []
    const cleanup = selectQuery([])
    const inserted = pendingRow()
    const insertQuery: Record<string, (...args: unknown[]) => unknown> = {
      insert: (value) => {
        order.push('insert')
        expect(value).toMatchObject({ created_by: 'staff-1', storage_path: expect.stringMatching(/^incoming\/[a-f0-9]{48}\.jpg$/) })
        return insertQuery
      },
      select: () => insertQuery,
      single: async () => ({ data: inserted, error: null }),
    }
    const update = updateQuery()
    const upload = vi.fn(async () => {
      order.push('token')
      return { data: null, error: new Error('provider rejected token') }
    })
    const storageFile = { createSignedUploadUrl: upload, remove: vi.fn() }
    const client = {
      from: vi.fn().mockReturnValueOnce(cleanup).mockReturnValueOnce(insertQuery).mockReturnValueOnce(update),
      storage: { from: vi.fn(() => storageFile) },
    }
    mockedServiceClient.mockReturnValue(client as never)

    const input = parseMediaSignRequest({ filename: 'poster.jpg', contentType: 'image/jpeg', size: 4 })
    await expect(signMediaUpload(input, 'staff-1')).rejects.toMatchObject({ code: 'storage_unavailable', status: 503 })
    expect(order).toEqual(['insert', 'token'])
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }))
  })

  it('bounds stale incoming cleanup and rejects/removes abandoned objects', async () => {
    const stale = pendingRow({
      id: '22222222-2222-4222-8222-222222222222',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const cleanup = selectQuery([stale])
    const rejected = updateQuery()
    const inserted = pendingRow({ id: '33333333-3333-4333-8333-333333333333' })
    const insertQuery: Record<string, (...args: unknown[]) => unknown> = {
      insert: vi.fn(() => insertQuery),
      select: () => insertQuery,
      single: async () => ({ data: inserted, error: null }),
    }
    const storageFile = {
      remove: vi.fn(async () => ({ error: null })),
      createSignedUploadUrl: vi.fn(async () => ({ data: { path: 'incoming/new', token: 'token' }, error: null })),
    }
    const client = {
      from: vi.fn().mockReturnValueOnce(cleanup).mockReturnValueOnce(rejected).mockReturnValueOnce(insertQuery),
      storage: { from: vi.fn(() => storageFile) },
    }
    mockedServiceClient.mockReturnValue(client as never)
    const input = parseMediaSignRequest({ filename: 'new.jpg', contentType: 'image/jpeg', size: 4 })
    await signMediaUpload(input, 'staff-1')
    expect(storageFile.remove).toHaveBeenCalledWith([stale.storage_path])
    expect(rejected.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }))
  })

  it('refuses a finalization owned by another staff member before touching storage', async () => {
    const client = {
      from: vi.fn().mockReturnValue(selectQuery(pendingRow({ created_by: 'other-staff' }))),
      storage: { from: vi.fn() },
    }
    mockedServiceClient.mockReturnValue(client as never)
    await expect(finalizeMediaUpload('00000000-0000-0000-0000-000000000001', 'staff-1')).rejects.toMatchObject({ code: 'media_owner_mismatch', status: 403 })
    expect(client.storage.from).not.toHaveBeenCalled()
  })

  it('claims an incoming row conditionally so a concurrent finalize cannot duplicate it', async () => {
    const initial = selectQuery(pendingRow())
    const claim = updateQuery(null)
    const client = {
      from: vi.fn().mockReturnValueOnce(initial).mockReturnValueOnce(claim),
      storage: { from: vi.fn() },
    }
    mockedServiceClient.mockReturnValue(client as never)
    await expect(finalizeMediaUpload('00000000-0000-0000-0000-000000000001', 'staff-1')).rejects.toMatchObject({ code: 'media_not_pending', status: 409 })
    expect(client.storage.from).not.toHaveBeenCalled()
  })

  it('rejects an object whose actual bytes differ from the signed claim', async () => {
    const initial = selectQuery(pendingRow({ byte_size: 10 }))
    const claimed = updateQuery(pendingRow({ status: 'processing', byte_size: 10 }))
    const rejected = updateQuery()
    const remove = vi.fn(async () => ({ error: null }))
    const storageFile = {
      createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://storage.test/object' }, error: null })),
      remove,
    }
    const client = {
      from: vi.fn().mockReturnValueOnce(initial).mockReturnValueOnce(claimed).mockReturnValueOnce(rejected),
      storage: { from: vi.fn(() => storageFile) },
    }
    mockedServiceClient.mockReturnValue(client as never)
    const previousFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async () => new Response(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), { status: 200 }))
    try {
      await expect(finalizeMediaUpload('00000000-0000-0000-0000-000000000001', 'staff-1')).rejects.toMatchObject({ code: 'media_size_mismatch', status: 400 })
    } finally {
      globalThis.fetch = previousFetch
    }
    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^incoming\//)])
    expect(rejected.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }))
  })

  it('validates a video with a bounded range and does not read the full body', async () => {
    const video = pendingRow({
      storage_path: 'incoming/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.mp4',
      original_filename: 'clip.mp4',
      content_type: 'video/mp4',
      byte_size: 1024,
      status: 'incoming',
    })
    const initial = selectQuery(video)
    const claimed = updateQuery({ ...video, status: 'processing' })
    const processingMetadata = updateQuery()
    const finalized = updateQuery({ ...video, status: 'finalized', storage_path: 'final/cccccccccccccccccccccccccccccccccccccccccccccccc.mp4' })
    const reads: string[] = []
    const sample = Uint8Array.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])
    const response = {
      ok: true,
      headers: new Headers({ 'content-range': 'bytes 0-11/1024' }),
      body: {
        getReader: () => ({
          read: async () => {
            if (reads.length === 0) {
              reads.push('sample')
              return { done: false, value: sample }
            }
            reads.push('done')
            return { done: true, value: undefined }
          },
          cancel: vi.fn(),
          releaseLock: vi.fn(),
        }),
      },
      arrayBuffer: vi.fn(),
    }
    const incomingFile = {
      createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://storage.test/video' }, error: null })),
      info: vi.fn(async () => ({ data: { size: 1024, etag: 'etag-value' }, error: null })),
      copy: vi.fn(async () => ({ error: null })),
      remove: vi.fn(async () => ({ error: null })),
    }
    const publicFile = { getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://project.supabase.co/storage/v1/object/public/public-media/final/video.mp4' } })) }
    const client = {
      from: vi.fn().mockReturnValueOnce(initial).mockReturnValueOnce(claimed).mockReturnValueOnce(processingMetadata).mockReturnValueOnce(finalized),
      storage: { from: vi.fn((bucket: string) => bucket === 'incoming-media' ? incomingFile : publicFile) },
    }
    mockedServiceClient.mockReturnValue(client as never)
    const previousFetch = globalThis.fetch
    const fetchMock = vi.fn(async () => response as never)
    globalThis.fetch = fetchMock
    try {
      const result = await finalizeMediaUpload(video.id, 'staff-1')
      expect(result.media.sha256).toBeNull()
      expect(result.media.metadata).toMatchObject({ storage_etag: 'etag-value' })
    } finally {
      globalThis.fetch = previousFetch
    }
    expect(fetchMock).toHaveBeenCalledWith('https://storage.test/video', {
      headers: { Range: `bytes=0-${SAMPLE_MAX_BYTES - 1}` },
    })
    expect(reads).toEqual(['sample', 'done'])
    expect(response.arrayBuffer).not.toHaveBeenCalled()
    expect(incomingFile.copy).toHaveBeenCalledWith(expect.stringMatching(/^incoming\//), expect.stringMatching(/^final\//), { destinationBucket: 'public-media' })
  })
})
