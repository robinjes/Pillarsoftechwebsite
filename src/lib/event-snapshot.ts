import rawEvents from '@/data/events.json'
import {
  eventRecordSchema,
  type EventRecord,
  publicEventSchema,
  type PublicEvent,
  normalizeLegacyDateTime,
} from '@/lib/content-contracts'

type LegacyEvent = {
  id?: unknown
  branch?: unknown
  title?: unknown
  date?: unknown
  time?: unknown
  location?: unknown
  description?: unknown
  status?: unknown
  image?: unknown
  imageAlt?: unknown
  heroImage?: unknown
  heroImageAlt?: unknown
  heroVideo?: unknown
  gallery?: unknown
  galleryAlts?: unknown
  registrationLink?: unknown
  registrationNote?: unknown
  pdfUrl?: unknown
  youtubeVideos?: unknown
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const values = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
  return values.length > 0 ? values : undefined
}

function textList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const values = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim())
  return values.some(Boolean) ? values : undefined
}

function status(value: unknown): EventRecord['status'] {
  if (value === 'past') return 'completed'
  if (value === 'upcoming' || value === 'ongoing' || value === 'completed' || value === 'cancelled') return value
  return 'completed'
}

function branch(value: unknown): EventRecord['branch'] {
  // Only the authoritative field is consulted. Legacy rows without it are
  // explicitly treated as California during the compatibility migration.
  return value === 'ga' ? 'ga' : 'ca'
}

export function legacyEventToRecord(input: LegacyEvent): EventRecord | null {
  const id = text(input.id)
  const title = text(input.title)
  if (!id || !title || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) return null

  const dateTime = normalizeLegacyDateTime(input.date, input.time)
  const image = text(input.image) || undefined
  const imageAlt = text(input.imageAlt) || undefined
  const heroImage = text(input.heroImage) || image
  const heroImageAlt = text(input.heroImageAlt) || undefined
  const heroVideo = text(input.heroVideo) || undefined
  const gallery = stringList(input.gallery)
  const galleryAlts = textList(input.galleryAlts)
  const youtubeVideos = stringList(input.youtubeVideos)
  const description = text(input.description)
  const parsed = eventRecordSchema.safeParse({
    id,
    slug: id,
    branch: branch(input.branch),
    title,
    summary: description.split(/\n\n/)[0]?.slice(0, 1_000) || '',
    description,
    startsAt: dateTime.startsAt,
    endsAt: null,
    timezone: 'America/New_York',
    startLabel: dateTime.startLabel,
    endLabel: dateTime.endLabel,
    location: text(input.location),
    programCategory: 'general',
    status: status(input.status),
    media: { image, imageAlt, heroImage, heroImageAlt, heroVideo, gallery, galleryAlts, youtubeVideos },
    resources: {
      pdfUrl: text(input.pdfUrl) || undefined,
      registrationLink: text(input.registrationLink) || undefined,
      registrationNote: text(input.registrationNote) || undefined,
    },
    participantRegistrationState: 'closed',
    volunteerRegistrationState: 'closed',
    participantCapacity: null,
    volunteerCapacity: null,
    // Legacy outcome stats are intentionally not imported.
    outcomes: {},
    publicationState: 'published',
  })

  return parsed.success ? parsed.data : null
}

export function getEventSnapshotRecords(): EventRecord[] {
  if (!Array.isArray(rawEvents)) return []
  return rawEvents
    .map((event) => legacyEventToRecord(event as LegacyEvent))
    .filter((event): event is EventRecord => Boolean(event))
}

export function toPublicEvent(event: EventRecord): PublicEvent | null {
  if (event.publicationState !== 'published' || event.status === 'draft') return null
  const publicEvent = {
    id: event.id,
    slug: event.slug,
    branch: event.branch,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    startLabel: event.startLabel,
    endLabel: event.endLabel,
    location: event.location,
    programCategory: event.programCategory,
    status: event.status,
    media: event.media,
    resources: event.resources,
    participantRegistrationState: event.participantRegistrationState,
    volunteerRegistrationState: event.volunteerRegistrationState,
    date: event.startLabel,
    time: event.endLabel,
    image: event.media.image,
    imageAlt: event.media.imageAlt,
    heroImage: event.media.heroImage,
    heroImageAlt: event.media.heroImageAlt,
    heroVideo: event.media.heroVideo,
    gallery: event.media.gallery,
    galleryAlts: event.media.galleryAlts,
    pdfUrl: event.resources.pdfUrl,
    youtubeVideos: event.media.youtubeVideos,
    registrationLink: event.resources.registrationLink,
    registrationNote: event.resources.registrationNote,
  }
  const parsed = publicEventSchema.safeParse(publicEvent)
  return parsed.success ? parsed.data : null
}

export function getPublicEventSnapshot(): PublicEvent[] {
  return getEventSnapshotRecords().map(toPublicEvent).filter((event): event is PublicEvent => Boolean(event))
}

export function getPublicEventSnapshotById(id: string): PublicEvent | null {
  return getPublicEventSnapshot().find((event) => event.id === id || event.slug === id) ?? null
}
