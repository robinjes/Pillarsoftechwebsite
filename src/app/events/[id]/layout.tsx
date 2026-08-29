import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { getPublicEvent } from '@/lib/content-repository'

type EventDetailParams = { params: Promise<{ id: string }> }

function eventUrl(slug: string): string {
  return `https://pillarsoftech.org/events/${encodeURIComponent(slug)}`
}

function eventJsonLd(event: Awaited<ReturnType<typeof getPublicEvent>>) {
  if (!event) return null
  const description = event.summary || event.description
  const images = [event.heroImage, event.image, ...(event.gallery ?? [])]
    .filter((value): value is string => Boolean(value))
    .map((value) => /^https:\/\//i.test(value) ? value : `https://pillarsoftech.org${value.startsWith('/') ? value : `/${value}`}`)
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
    eventStatus: event.status === 'cancelled' ? 'https://schema.org/EventCancelled' : event.status === 'completed' ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
    organizer: {
      '@type': 'Organization',
      name: 'Pillars of Tech',
      url: 'https://pillarsoftech.org',
    },
  }
}

export async function generateMetadata({ params }: EventDetailParams): Promise<Metadata> {
  const { id } = await params
  const event = await getPublicEvent(id)
  if (!event) notFound()
  return {
    title: event.title,
    description: event.summary || event.description || 'See the confirmed schedule, location, help guidance, and approved media for a Pillars of Tech event.',
    alternates: { canonical: `/events/${encodeURIComponent(event.slug)}` },
  }
}

export default async function EventDetailLayout({ children, params }: EventDetailParams & { children: React.ReactNode }) {
  const { id } = await params
  const event = await getPublicEvent(id)
  if (!event) notFound()
  const jsonLd = eventJsonLd(event)
  const serialized = jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : null
  const nonce = (await headers()).get('x-nonce') || undefined

  return <>{children}{serialized ? <script id="event-jsonld" nonce={nonce} suppressHydrationWarning type="application/ld+json">{serialized}</script> : null}</>
}
