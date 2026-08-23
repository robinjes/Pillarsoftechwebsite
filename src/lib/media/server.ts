import 'server-only'

import { createHash } from 'node:crypto'
import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'
import {
  MEDIA_BUCKET,
  bucketForMediaKind,
  IMAGE_MAX_BYTES,
  mediaSignRequestSchema,
  MEDIA_POLICIES,
  SAMPLE_MAX_BYTES,
  SIGNED_DELIVERY_EXPIRES_SECONDS,
  type DetectedMedia,
  type MediaKind,
  type MediaPolicy,
  detectedMatchesClaimed,
  detectMediaType,
  objectKeyFor,
  safeOutputPolicy,
  validateClaimedUpload,
  type MediaSignRequest,
} from './policy'

export type MediaPipelineErrorStatus = 400 | 403 | 404 | 409 | 503

export class MediaPipelineError extends Error {
  readonly status: MediaPipelineErrorStatus
  readonly code: string

  constructor(message: string, status: MediaPipelineErrorStatus = 503, code = 'media_pipeline_error') {
    super(message)
    this.name = 'MediaPipelineError'
    this.status = status
    this.code = code
  }
}

export type PendingMedia = {
  id: string
  storage_path: string
  original_filename: string
  content_type: string
  byte_size: number
  visibility: 'private' | 'public'
  status: 'incoming' | 'processing' | 'finalized' | 'rejected'
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at?: string
}

type StorageFile = ReturnType<SupabaseClient['storage']['from']>

function mediaClient(): SupabaseClient {
  try {
    return createSupabaseServiceRoleClient()
  } catch {
    throw new MediaPipelineError('Media storage is not configured on this server.', 503, 'configuration_unavailable')
  }
}

function storage(client: SupabaseClient): StorageFile {
  return client.storage.from(MEDIA_BUCKET)
}

function finalStorage(client: SupabaseClient, kind: MediaKind): StorageFile {
  return client.storage.from(bucketForMediaKind(kind))
}

function asPendingMedia(value: unknown): PendingMedia {
  if (!value || typeof value !== 'object') {
    throw new MediaPipelineError('The media record is invalid.', 503)
  }
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.storage_path !== 'string' || typeof row.content_type !== 'string') {
    throw new MediaPipelineError('The media record is invalid.', 503)
  }
  if (row.status !== 'incoming' && row.status !== 'processing' && row.status !== 'finalized' && row.status !== 'rejected') {
    throw new MediaPipelineError('The media record has an invalid status.', 503)
  }
  return {
    id: row.id,
    storage_path: row.storage_path,
    original_filename: typeof row.original_filename === 'string' ? row.original_filename : 'download',
    content_type: row.content_type,
    byte_size: Number(row.byte_size),
    visibility: row.visibility === 'public' ? 'public' : 'private',
    status: row.status,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : null,
    created_by: typeof row.created_by === 'string' ? row.created_by : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
  }
}

async function updateMedia(client: SupabaseClient, id: string, values: Record<string, unknown>) {
  const { error } = await client.from('media_assets').update(values).eq('id', id)
  if (error) throw new MediaPipelineError('The media record could not be updated.', 503)
}

async function deleteObject(file: StorageFile, path: string): Promise<void> {
  const { error } = await file.remove([path])
  if (error) {
    // Cleanup is best effort; the row remains rejected and the object is not
    // reachable through any public policy or delivery route.
    console.error('Failed to remove rejected media object:', error.message)
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.ok) throw new MediaPipelineError('Storage could not return the uploaded object.', 400, 'storage_object_unavailable')
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new MediaPipelineError('The uploaded object exceeds its size limit.', 400, 'media_too_large')
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > maxBytes) throw new MediaPipelineError('The uploaded object exceeds its size limit.', 400, 'media_too_large')
    return bytes
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new MediaPipelineError('The uploaded object exceeds its size limit.', 400, 'media_too_large')
      }
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

function parseTotalFromContentRange(value: string | null): number | null {
  if (!value) return null
  const match = /^bytes\s+\d+-\d+\/(\d+)$/.exec(value)
  if (!match) return null
  const total = Number(match[1])
  return Number.isSafeInteger(total) ? total : null
}

async function signedUrl(file: StorageFile, path: string, expires = SIGNED_DELIVERY_EXPIRES_SECONDS): Promise<string> {
  const { data, error } = await file.createSignedUrl(path, expires)
  if (error || !data?.signedUrl) {
    throw new MediaPipelineError('Storage could not create a signed URL.', 503, 'storage_unavailable')
  }
  return data.signedUrl
}

const STALE_UPLOAD_AGE_MS = 24 * 60 * 60 * 1000

async function cleanupAbandonedUploads(client: SupabaseClient, file: StorageFile, limit = 25): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_UPLOAD_AGE_MS).toISOString()
  const { data, error } = await client
    .from('media_assets')
    .select('id,storage_path,original_filename,content_type,byte_size,visibility,status,metadata,created_by,created_at')
    .in('status', ['incoming', 'processing'])
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error || !data) return

  for (const value of data) {
    const stale = asPendingMedia(value)
    await deleteObject(file, stale.storage_path)
    const finalPath = stale.metadata?.final_path
    if (stale.status === 'processing' && typeof finalPath === 'string' && finalPath.startsWith('final/')) {
      const policy = MEDIA_POLICIES[String(stale.metadata?.output_content_type || stale.content_type)]
      if (policy) await deleteObject(finalStorage(client, policy.kind), finalPath)
    }
    await updateMedia(client, stale.id, {
      status: 'rejected',
      metadata: { ...(stale.metadata || {}), rejection: 'upload_expired' },
    })
  }
}

async function inspectBoundedObject(
  file: StorageFile,
  path: string,
  policy: MediaPolicy,
  kind: MediaKind,
): Promise<{ detected: DetectedMedia; actualSize: number; checksum: string | null; storageEtag?: string }> {
  const url = await signedUrl(file, path)

  if (kind === 'video') {
    // A range request samples only the header. The total in Content-Range (or
    // Content-Length) is checked without sending the full video through this
    // route. If storage cannot provide a total, finalization fails closed.
    const { data: info } = await file.info(path)
    const infoSize = Number((info as { size?: unknown } | null)?.size)
    const response = await fetch(url, { headers: { Range: `bytes=0-${SAMPLE_MAX_BYTES - 1}` } })
    const total = parseTotalFromContentRange(response.headers.get('content-range'))
      ?? (Number.isSafeInteger(infoSize) ? infoSize : Number(response.headers.get('content-length')))
    if (!response.ok || !Number.isSafeInteger(total) || total <= 0 || total > policy.maxBytes) {
      throw new MediaPipelineError('Video size could not be verified safely.', 400, 'video_size_unverified')
    }
    const sample = await readBounded(response, SAMPLE_MAX_BYTES)
    const detected = detectMediaType(sample)
    if (!detected || !detectedMatchesClaimed(policy, detected)) {
      throw new MediaPipelineError('The uploaded video does not match its claimed type.', 400, 'media_magic_mismatch')
    }
    const etag = (info as { etag?: unknown } | null)?.etag
    return { detected, actualSize: total, checksum: null, storageEtag: typeof etag === 'string' ? etag : undefined }
  }

  const response = await fetch(url)
  const bytes = await readBounded(response, policy.maxBytes)
  const detected = detectMediaType(bytes)
  if (!detected || !detectedMatchesClaimed(policy, detected)) {
    throw new MediaPipelineError('The uploaded object does not match its claimed type.', 400, 'media_magic_mismatch')
  }
  return { detected, actualSize: bytes.byteLength, checksum: sha256(bytes) }
}

export function parseMediaSignRequest(value: unknown): MediaSignRequest & { policy: MediaPolicy; displayName: string } {
  const parsed = mediaSignRequestSchema.safeParse(value)
  if (!parsed.success) throw new MediaPipelineError('Invalid media sign request.', 400, 'invalid_media_request')
  const validated = validateClaimedUpload(parsed.data)
  if ('error' in validated) throw new MediaPipelineError(validated.error, 400, 'invalid_media_request')
  return { ...parsed.data, ...validated }
}

export async function signMediaUpload(
  input: MediaSignRequest & { policy: MediaPolicy; displayName: string },
  userId: string,
) {
  const client = mediaClient()
  const file = storage(client)
  await cleanupAbandonedUploads(client, file)
  const path = objectKeyFor(input.policy, 'incoming')

  const { data: row, error: rowError } = await client
    .from('media_assets')
    .insert({
      storage_path: path,
      original_filename: input.displayName,
      content_type: input.policy.contentType,
      byte_size: input.size,
      visibility: input.policy.kind === 'document' ? 'private' : 'public',
      status: 'incoming',
      metadata: {
        media_kind: input.policy.kind,
        claimed_content_type: input.policy.contentType,
        claimed_size: input.size,
      },
      created_by: userId,
      updated_by: userId,
    })
    .select('id,storage_path,original_filename,content_type,byte_size,visibility,status,metadata,created_by,created_at')
    .single()
  if (rowError || !row) {
    throw new MediaPipelineError('The pending media record could not be created.', 503, 'media_record_unavailable')
  }

  // Create the token only after the owner-bound pending row exists. If the
  // provider cannot issue a token, mark the row rejected so no live token can
  // outlast its database record.
  const { data: signed, error: signedError } = await file.createSignedUploadUrl(path, { upsert: false })
  if (signedError || !signed) {
    await updateMedia(client, asPendingMedia(row).id, {
      status: 'rejected',
      metadata: { ...(asPendingMedia(row).metadata || {}), rejection: 'upload_token_unavailable' },
      updated_by: userId,
    })
    throw new MediaPipelineError('Storage could not create a one-time upload URL.', 503, 'storage_unavailable')
  }

  return {
    media: asPendingMedia(row),
    upload: {
      bucket: MEDIA_BUCKET,
      path: signed.path,
      token: signed.token,
    },
  }
}

export async function finalizeMediaUpload(mediaId: string, userId: string) {
  const client = mediaClient()
  const { data: row, error: rowError } = await client
    .from('media_assets')
    .select('id,storage_path,original_filename,content_type,byte_size,visibility,status,metadata,created_by,created_at')
    .eq('id', mediaId)
    .maybeSingle()
  if (rowError) throw new MediaPipelineError('The media record could not be loaded.', 503)
  if (!row) throw new MediaPipelineError('Pending media was not found.', 404, 'media_not_found')

  const pending = asPendingMedia(row)
  if (pending.created_by !== userId) {
    throw new MediaPipelineError('Only the staff member who started this upload may finalize it.', 403, 'media_owner_mismatch')
  }
  if (pending.status !== 'incoming') {
    throw new MediaPipelineError('This media upload is no longer pending.', 409, 'media_not_pending')
  }

  const { data: claimedRow, error: claimError } = await client
    .from('media_assets')
    .update({ status: 'processing', updated_by: userId })
    .eq('id', pending.id)
    .eq('status', 'incoming')
    .eq('created_by', userId)
    .select('id,storage_path,original_filename,content_type,byte_size,visibility,status,metadata,created_by,created_at')
    .maybeSingle()
  if (claimError) throw new MediaPipelineError('The media upload could not be claimed.', 503, 'media_record_unavailable')
  if (!claimedRow) throw new MediaPipelineError('This media upload is already being finalized.', 409, 'media_not_pending')
  const claimed = asPendingMedia(claimedRow)

  const claimedPolicy = validateClaimedUpload({
    filename: claimed.original_filename,
    contentType: claimed.content_type as MediaSignRequest['contentType'],
    size: claimed.byte_size,
  })
  const file = storage(client)
  if ('error' in claimedPolicy) {
    await deleteObject(file, claimed.storage_path)
    await updateMedia(client, claimed.id, { status: 'rejected', updated_by: userId })
    throw new MediaPipelineError('The pending media metadata is invalid.', 400, 'invalid_media_record')
  }
  if (claimedPolicy.policy.kind === 'document' && claimed.visibility !== 'private') {
    await deleteObject(file, claimed.storage_path)
    await updateMedia(client, claimed.id, { status: 'rejected', updated_by: userId })
    throw new MediaPipelineError('PDF assets must remain private.', 400, 'invalid_media_visibility')
  }

  let inspection: { detected: DetectedMedia; actualSize: number; checksum: string | null; storageEtag?: string }
  try {
    inspection = await inspectBoundedObject(file, claimed.storage_path, claimedPolicy.policy, claimedPolicy.policy.kind)
  } catch (error) {
    await deleteObject(file, claimed.storage_path)
    await updateMedia(client, claimed.id, {
      status: 'rejected',
      metadata: { ...(claimed.metadata || {}), rejection: error instanceof Error ? error.message : 'validation_failed' },
      updated_by: userId,
    })
    throw error
  }

  if (inspection.actualSize !== claimed.byte_size) {
    await deleteObject(file, claimed.storage_path)
    await updateMedia(client, claimed.id, {
      status: 'rejected',
      metadata: { ...(claimed.metadata || {}), rejection: 'claimed_size_mismatch', detected_size: inspection.actualSize },
      updated_by: userId,
    })
    throw new MediaPipelineError('The uploaded object size does not match its signed claim.', 400, 'media_size_mismatch')
  }

  const outputPolicy = safeOutputPolicy(inspection.detected)
  const finalPath = objectKeyFor(outputPolicy, 'final')
  await updateMedia(client, claimed.id, {
    metadata: { ...(claimed.metadata || {}), final_path: finalPath },
    updated_by: userId,
  })

  let outputBytes: Uint8Array | null = null
  if (inspection.detected.kind === 'image') {
    const { data: sourceSignedUrl, error: sourceUrlError } = await file.createSignedUrl(claimed.storage_path, SIGNED_DELIVERY_EXPIRES_SECONDS)
    if (sourceUrlError || !sourceSignedUrl?.signedUrl) {
      await deleteObject(file, claimed.storage_path)
      await updateMedia(client, claimed.id, { status: 'rejected', updated_by: userId })
      throw new MediaPipelineError('Storage could not read the pending object.', 503, 'storage_unavailable')
    }
    const response = await fetch(sourceSignedUrl.signedUrl)
    const inputBytes = await readBounded(response, claimedPolicy.policy.maxBytes)
    try {
      outputBytes = await sanitizeImageBuffer(inputBytes)
    } catch {
      await deleteObject(file, claimed.storage_path)
      await updateMedia(client, claimed.id, { status: 'rejected', updated_by: userId })
      throw new MediaPipelineError('The image could not be decoded and sanitized.', 400, 'image_decode_failed')
    }
    if (outputBytes.byteLength === 0 || outputBytes.byteLength > IMAGE_MAX_BYTES) {
      await deleteObject(file, claimed.storage_path)
      await updateMedia(client, claimed.id, { status: 'rejected', updated_by: userId })
      throw new MediaPipelineError('The sanitized image exceeds its size limit.', 400, 'media_too_large')
    }
  }

  const finalBucket = bucketForMediaKind(outputPolicy.kind)
  const finalFile = client.storage.from(finalBucket)
  const copyOrUpload = outputBytes
    ? finalFile.upload(finalPath, outputBytes, { contentType: outputPolicy.contentType, upsert: false, cacheControl: '31536000' })
    : file.copy(claimed.storage_path, finalPath, { destinationBucket: finalBucket })
  const { error: outputError } = await copyOrUpload
  if (outputError) {
    await deleteObject(finalFile, finalPath)
    await deleteObject(file, claimed.storage_path)
    await updateMedia(client, claimed.id, { status: 'rejected', updated_by: userId })
    throw new MediaPipelineError('The finalized media object could not be stored.', 503, 'storage_unavailable')
  }

  const finalSize = outputBytes?.byteLength ?? inspection.actualSize
  const finalChecksum = outputBytes ? sha256(outputBytes) : inspection.checksum
  const metadata = {
    ...(claimed.metadata || {}),
    detected_content_type: inspection.detected.contentType,
    detected_size: inspection.actualSize,
    output_content_type: outputPolicy.contentType,
    output_size: finalSize,
    checksum_algorithm: finalChecksum ? 'sha256' : 'unavailable-for-range-only-video',
    ...(inspection.storageEtag ? { storage_etag: inspection.storageEtag } : {}),
  }
  const { data: finalizedRow, error: finalizedError } = await client
    .from('media_assets')
    .update({
      storage_path: finalPath,
      content_type: outputPolicy.contentType,
      byte_size: finalSize,
      sha256: finalChecksum,
      visibility: outputPolicy.kind === 'document' ? 'private' : 'public',
      status: 'finalized',
      metadata,
      updated_by: userId,
    })
    .eq('id', claimed.id)
    .eq('status', 'processing')
    .select('id,storage_path,original_filename,content_type,byte_size,visibility,status,metadata,created_by,created_at')
    .maybeSingle()
  if (finalizedError || !finalizedRow) {
    await deleteObject(finalFile, finalPath)
    throw new MediaPipelineError('The finalized media record could not be committed.', 503, 'media_record_unavailable')
  }

  await deleteObject(file, claimed.storage_path)

  const delivery = outputPolicy.kind === 'document'
    ? `/api/media/${claimed.id}`
    : finalFile.getPublicUrl(finalPath).data.publicUrl
  return {
    media: {
      ...claimed,
      storage_path: finalPath,
      content_type: outputPolicy.contentType,
      byte_size: finalSize,
      sha256: finalChecksum,
      visibility: outputPolicy.kind === 'document' ? 'private' : 'public',
      status: 'finalized' as const,
      metadata,
    },
    url: delivery,
  }
}

export async function getPrivatePdfDelivery(mediaId: string) {
  const client = mediaClient()
  const { data: row, error } = await client
    .from('media_assets')
    .select('id,storage_path,original_filename,content_type,byte_size,visibility,status,metadata,created_by,created_at')
    .eq('id', mediaId)
    .maybeSingle()
  if (error) throw new MediaPipelineError('Media delivery is temporarily unavailable.', 503)
  if (!row) throw new MediaPipelineError('Media was not found.', 404, 'media_not_found')
  const media = asPendingMedia(row)
  if (media.status !== 'finalized' || media.content_type !== 'application/pdf' || media.visibility !== 'private' || !media.storage_path.startsWith('final/')) {
    throw new MediaPipelineError('This media is not an approved private document.', 404, 'media_not_deliverable')
  }
  const url = await signedUrl(finalStorage(client, 'document'), media.storage_path)
  return { media, url }
}

export async function getMediaDelivery(mediaId: string) {
  const client = mediaClient()
  const { data: row, error } = await client
    .from('media_assets')
    .select('id,storage_path,original_filename,content_type,byte_size,visibility,status,metadata,created_by,created_at')
    .eq('id', mediaId)
    .maybeSingle()
  if (error) throw new MediaPipelineError('Media delivery is temporarily unavailable.', 503)
  if (!row) throw new MediaPipelineError('Media was not found.', 404, 'media_not_found')

  const media = asPendingMedia(row)
  if (media.status !== 'finalized' || !media.storage_path.startsWith('final/')) {
    throw new MediaPipelineError('This media is not approved for delivery.', 404, 'media_not_deliverable')
  }

  if (media.content_type === 'application/pdf' && media.visibility === 'private') {
    return { media, url: await signedUrl(finalStorage(client, 'document'), media.storage_path) }
  }

  const policy = MEDIA_POLICIES[media.content_type]
  if (!policy || policy.kind === 'document' || media.visibility !== 'public') {
    throw new MediaPipelineError('This media is not approved for public delivery.', 404, 'media_not_deliverable')
  }
  return { media, url: finalStorage(client, policy.kind).getPublicUrl(media.storage_path).data.publicUrl }
}

export async function sanitizeImageBuffer(inputBytes: Uint8Array): Promise<Uint8Array> {
  return sharp(inputBytes, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .webp({ quality: 86, effort: 4 })
    .toBuffer()
}
