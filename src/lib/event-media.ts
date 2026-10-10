import type { PublicEvent } from '@/lib/content-contracts'

type EventMediaAltInput = Pick<PublicEvent, 'title' | 'media'> & Partial<Pick<
  PublicEvent,
  'image' | 'imageAlt' | 'heroImage' | 'heroImageAlt' | 'gallery' | 'galleryAlts'
>>

export type EventImageKind = 'hero' | 'image' | 'gallery'

/** Match the approved image hosts in next.config.js and the site's media CSP. */
export function eventMediaSource(value?: string | null, kind: 'image' | 'video' = 'image'): string | null {
  if (!value || value.includes('..') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return null
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const url = new URL(value)
    if (url.username || url.password) return null
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    if (url.protocol !== 'https:' && !localHttp) return null
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    if (storageUrl && url.origin === new URL(storageUrl).origin && url.pathname.startsWith('/storage/v1/object/public/')) return value
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
    if (kind === 'image' && cloud && url.origin === 'https://res.cloudinary.com' && url.pathname.startsWith(`/${cloud}/image/upload/`)) return value
  } catch {
    return null
  }
  return null
}

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim()
  return result || undefined
}

function matches(source: string | undefined, candidate: string | undefined): boolean {
  return !source || source === candidate
}

/** Resolve an event image description while keeping legacy title-based fallbacks. */
export function resolveEventImageAlt(
  event: EventMediaAltInput,
  kind: EventImageKind,
  source?: string,
  displayIndex = 0,
): string {
  const media = event.media
  const image = media.image ?? event.image
  const heroImage = media.heroImage ?? event.heroImage
  const gallery = media.gallery ?? event.gallery ?? []
  const imageAlt = trimmed(media.imageAlt) ?? trimmed(event.imageAlt)
  const heroImageAlt = trimmed(media.heroImageAlt) ?? trimmed(event.heroImageAlt)
  const galleryIndex = source ? gallery.indexOf(source) : displayIndex
  const galleryAlt = galleryIndex >= 0
    ? trimmed(media.galleryAlts?.[galleryIndex]) ?? trimmed(event.galleryAlts?.[galleryIndex])
    : undefined

  const candidates = kind === 'hero'
    ? [
        matches(source, heroImage) ? heroImageAlt : undefined,
        !heroImage && matches(source, image) ? heroImageAlt : undefined,
        matches(source, image) ? imageAlt : undefined,
        matches(source, gallery[galleryIndex]) ? galleryAlt : undefined,
      ]
    : kind === 'image'
    ? [
        matches(source, image) ? imageAlt : undefined,
        matches(source, heroImage) ? heroImageAlt : undefined,
        matches(source, gallery[galleryIndex]) ? galleryAlt : undefined,
      ]
    : [
        matches(source, image) ? imageAlt : undefined,
        matches(source, gallery[galleryIndex]) ? galleryAlt : undefined,
        matches(source, heroImage) ? heroImageAlt : undefined,
      ]

  const explicit = candidates.find((value): value is string => Boolean(value))
  if (explicit) return explicit

  const title = trimmed(event.title) || 'Event'
  return kind === 'gallery' ? `${title} event image ${Math.max(0, displayIndex) + 1}` : `${title} event photo`
}
