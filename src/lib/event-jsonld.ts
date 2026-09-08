import type { PublicEvent } from '@/lib/content-contracts'

export type EventJsonLdStatus =
  | 'https://schema.org/EventCancelled'
  | 'https://schema.org/EventScheduled'

/**
 * Map only public event states to Schema.org's EventStatusType values.
 * Completed events intentionally omit eventStatus because Schema.org does not
 * define a completed-event status value.
 */
export function eventStatusForJsonLd(status: PublicEvent['status']): EventJsonLdStatus | undefined {
  if (status === 'cancelled') return 'https://schema.org/EventCancelled'
  if (status === 'upcoming' || status === 'ongoing') return 'https://schema.org/EventScheduled'
  return undefined
}

function eventUrl(slug: string): string {
  return `https://pillarsoftech.org/events/${encodeURIComponent(slug)}`
}

export function eventJsonLd(event: PublicEvent) {
  const description = event.summary || event.description
  const images = [event.heroImage, event.image, ...(event.gallery ?? [])]
    .filter((value): value is string => Boolean(value))
    .map((value) => /^https:\/\//i.test(value) ? value : `https://pillarsoftech.org${value.startsWith('/') ? value : `/${value}`}`)
  const eventStatus = eventStatusForJsonLd(event.status)

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    ...(description ? { description } : {}),
    url: eventUrl(event.slug),
    ...(event.startsAt ? { startDate: event.startsAt } : {}),
    ...(event.endsAt ? { endDate: event.endsAt } : {}),
    ...(images.length > 0 ? { image: Array.from(new Set(images)) } : {}),
    ...(event.location ? { location: { '@type': 'Place', name: event.location } } : {}),
    ...(eventStatus ? { eventStatus } : {}),
    organizer: {
      '@type': 'Organization',
      name: 'Pillars of Tech',
      url: 'https://pillarsoftech.org',
    },
  }
}
