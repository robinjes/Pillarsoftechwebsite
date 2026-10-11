import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { PublicEvent } from '@/lib/content-contracts'
import { eventMediaSource, resolveEventImageAlt } from '@/lib/event-media'
import { PageShell } from '@/components/site/FamilyPrimitives'
import CareerPanelLumaCheckout from '@/components/CareerPanelLumaCheckout'
import { publicEventPath } from '@/lib/event-path'
import { publicEventLocation } from '@/lib/career-panel-details'

function detail(value: string | undefined): string {
  return value?.trim() || 'Details coming soon'
}
export default function NextEventSection({ event }: { event: PublicEvent | null }) {
  if (!event) {
    return (
      <section id="events" className="border-y border-[var(--ink)]/20 py-6" aria-label="Past events">
        <PageShell>
          <Link className="text-link focus-ring" href="/events?status=completed">
            View our past events <ArrowRight aria-hidden="true" />
          </Link>
        </PageShell>
      </section>
    )
  }
  const image = eventMediaSource(event.image) || eventMediaSource(event.heroImage)
  const date = event.date || event.startLabel || ''
  const time = event.time || event.endLabel || ''
  const when = date && time ? `${date} · ${time}` : date || time || 'Details coming soon'
  const location = event.id === 'career-panel-granada' ? publicEventLocation(event) : event.location || 'Details coming soon'
  const isCurrent = event.status === 'upcoming' || event.status === 'ongoing'

  return (
    <section className="event-section section" id="events" aria-labelledby="next-event-heading">
      <PageShell>
        <div className="event-panel">
          <div className="event-image-wrap">
            <Image
              src={image || "/images/home/wildcat-carnival.webp"}
              alt={image ? resolveEventImageAlt(event, 'image', image) : 'Young people and volunteers doing a hands-on activity outdoors at a community event'}
              style={{ objectFit: image ? 'contain' : 'cover' }}
              fill
              sizes="(max-width: 980px) 100vw, 50vw"
            />
          </div>
          <div className="event-copy">
            <p className="eyebrow">What&apos;s happening next</p>
            <h2 id="next-event-heading" className="family-heading">Our next event</h2>
            <h3 className="event-title family-heading">{event.title}</h3>
            {event.id === 'career-panel-granada' ? <p className="mb-4 text-lg font-bold text-[var(--midnight)]">FREE admission · Register today!</p> : null}
            <p className="event-intro">
              {event.summary || 'We’ll share the activity, age guidance, schedule, location, and registration details as soon as they’re confirmed.'}
            </p>
            <dl className="event-details">
              <div>
                <dt>When</dt>
                <dd>{detail(when)}</dd>
              </div>
              <div>
                <dt>Where</dt>
                <dd>{location}</dd>
              </div>
            </dl>
            <div className="mb-5">
              {event.id === 'career-panel-granada' ? (
                <CareerPanelLumaCheckout event={event} />
              ) : isCurrent && event.participantRegistrationState === 'open' ? (
                <Link href={`/register/${event.slug || event.id}`} className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--midnight)] px-6 py-4 text-lg font-bold text-[var(--cream)] hover:bg-[var(--cobalt)] focus-ring">Register for Event</Link>
              ) : isCurrent && event.registrationLink ? (
                <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--midnight)] px-6 py-4 text-lg font-bold text-[var(--cream)] hover:bg-[var(--cobalt)] focus-ring">Register for Event</a>
              ) : isCurrent && event.registrationNote ? (
                <p className="text-sm leading-6">{event.registrationNote}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-4">
              <Link className="text-link focus-ring" href={publicEventPath(event)}>
                See event details <ArrowRight aria-hidden="true" />
              </Link>
              <Link className="text-link focus-ring" href="/contact">
                Ask us about upcoming events <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    </section>
  )
}
