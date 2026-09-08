import { randomBytes } from 'node:crypto'
import { z } from 'zod'

export const MEDIA_BUCKET = 'incoming-media'
export const PUBLIC_MEDIA_BUCKET = 'public-media'
export const PRIVATE_DOCUMENT_BUCKET = 'private-documents'
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const PDF_MAX_BYTES = 20 * 1024 * 1024
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024
export const SAMPLE_MAX_BYTES = 64 * 1024
export const SIGNED_DELIVERY_EXPIRES_SECONDS = 5 * 60

export type MediaKind = 'image' | 'document' | 'video'

export type MediaPolicy = {
  kind: MediaKind
  contentType: string
  extension: 'jpg' | 'png' | 'webp' | 'avif' | 'pdf' | 'mp4' | 'webm' | 'mov'
  maxBytes: number
}

export const MEDIA_POLICIES: Record<string, MediaPolicy> = {
  'image/jpeg': { kind: 'image', contentType: 'image/jpeg', extension: 'jpg', maxBytes: IMAGE_MAX_BYTES },
  'image/png': { kind: 'image', contentType: 'image/png', extension: 'png', maxBytes: IMAGE_MAX_BYTES },
  'image/webp': { kind: 'image', contentType: 'image/webp', extension: 'webp', maxBytes: IMAGE_MAX_BYTES },
  'image/avif': { kind: 'image', contentType: 'image/avif', extension: 'avif', maxBytes: IMAGE_MAX_BYTES },
  'application/pdf': { kind: 'document', contentType: 'application/pdf', extension: 'pdf', maxBytes: PDF_MAX_BYTES },
  'video/mp4': { kind: 'video', contentType: 'video/mp4', extension: 'mp4', maxBytes: VIDEO_MAX_BYTES },
  'video/webm': { kind: 'video', contentType: 'video/webm', extension: 'webm', maxBytes: VIDEO_MAX_BYTES },
  'video/quicktime': { kind: 'video', contentType: 'video/quicktime', extension: 'mov', maxBytes: VIDEO_MAX_BYTES },
}

const mediaContentTypes = Object.keys(MEDIA_POLICIES) as [string, ...string[]]

function hasPathLikeFilenamePart(value: string): boolean {
  let candidate = value
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (
      candidate === '.' ||
      candidate === '..' ||
      /[\\/\u0000-\u001f\u007f]/.test(candidate) ||
      /%(?:2e|2f|5c)/i.test(candidate)
    ) return true
    try {
      const decoded = decodeURIComponent(candidate)
      if (decoded === candidate) return false
      candidate = decoded
    } catch {
      return false
    }
  }
  return false
}

export function isSafeUploadFilename(value: string): boolean {
  return value.trim().length > 0 && !hasPathLikeFilenamePart(value)
}

export const mediaSignRequestSchema = z.object({
  filename: z.string().min(1).max(240).refine(isSafeUploadFilename, 'Filename must be a plain file name.').trim(),
  contentType: z.enum(mediaContentTypes),
  size: z.number().int().positive(),
}).strict()

export type MediaSignRequest = z.infer<typeof mediaSignRequestSchema>

export type DetectedMedia = {
  kind: MediaKind
  contentType: string
  extension: MediaPolicy['extension']
}

function startsWithBytes(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((value, index) => bytes[index] === value)
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

function hasFtypBrand(bytes: Uint8Array, brands: string[]): boolean {
  if (bytes.length < 12 || ascii(bytes, 4, 4) !== 'ftyp') return false
  const brandBytes = bytes.slice(8, Math.min(bytes.length, 256))
  const brandText = String.fromCharCode(...brandBytes)
  return brands.some((brand) => brandText.includes(brand))
}

export function detectMediaType(bytes: Uint8Array): DetectedMedia | null {
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return { kind: 'image', contentType: 'image/jpeg', extension: 'jpg' }
  }
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: 'image', contentType: 'image/png', extension: 'png' }
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return { kind: 'image', contentType: 'image/webp', extension: 'webp' }
  }
  if (hasFtypBrand(bytes, ['avif', 'avis'])) {
    return { kind: 'image', contentType: 'image/avif', extension: 'avif' }
  }
  if (startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { kind: 'document', contentType: 'application/pdf', extension: 'pdf' }
  }
  if (startsWithBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3]) && ascii(bytes, 0, bytes.length).includes('webm')) {
    return { kind: 'video', contentType: 'video/webm', extension: 'webm' }
  }
  if (hasFtypBrand(bytes, ['qt  '])) {
    return { kind: 'video', contentType: 'video/quicktime', extension: 'mov' }
  }
  if (hasFtypBrand(bytes, ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'mp4'])) {
    return { kind: 'video', contentType: 'video/mp4', extension: 'mp4' }
  }
  return null
}

export function normalizeDisplayName(filename: string): string {
  const basename = filename.replace(/\\/g, '/').split('/').pop() || 'upload'
  const cleaned = basename
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
  return cleaned || 'upload'
}

export function objectKeyFor(policy: MediaPolicy, prefix: 'incoming' | 'final' = 'incoming'): string {
  const randomPart = randomBytes(24).toString('hex')
  return `${prefix}/${randomPart}.${policy.extension}`
}

export function validateClaimedUpload(input: MediaSignRequest): { policy: MediaPolicy; displayName: string } | { error: string } {
  if (!isSafeUploadFilename(input.filename)) return { error: 'Filename must be a plain file name.' }
  const policy = MEDIA_POLICIES[input.contentType]
  if (!policy) return { error: 'Unsupported media type.' }
  if (input.size > policy.maxBytes) {
    return { error: `The selected ${policy.kind} exceeds its size limit.` }
  }
  return { policy, displayName: normalizeDisplayName(input.filename) }
}

export function detectedMatchesClaimed(policy: MediaPolicy, detected: DetectedMedia): boolean {
  return policy.kind === detected.kind && policy.contentType === detected.contentType
}

export function safeOutputPolicy(detected: DetectedMedia): MediaPolicy {
  if (detected.kind === 'image') {
    return { kind: 'image', contentType: 'image/webp', extension: 'webp', maxBytes: IMAGE_MAX_BYTES }
  }
  return MEDIA_POLICIES[detected.contentType]
}

export function bucketForMediaKind(kind: MediaKind): string {
  return kind === 'document' ? PRIVATE_DOCUMENT_BUCKET : PUBLIC_MEDIA_BUCKET
}
