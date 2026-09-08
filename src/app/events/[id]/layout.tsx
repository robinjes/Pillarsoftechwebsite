import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { getPublicEvent } from '@/lib/content-repository'
import { eventJsonLd } from '@/lib/event-jsonld'

type EventDetailParams = { params: Promise<{ id: string }> }

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
