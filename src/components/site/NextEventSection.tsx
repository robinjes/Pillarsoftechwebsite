import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { PublicEvent } from '@/lib/content-contracts'
import { PageShell } from '@/components/site/FamilyPrimitives'

function detail(value: string | undefined): string {
  return value?.trim() || 'Details coming soon'
}
export default function NextEventSection({ event }: { event: PublicEvent | null }) {
  const date = event?.date || event?.startLabel || ''
  const time = event?.time || event?.endLabel || ''
  const when = date && time ? `${date} · ${time}` : date || time || 'Details coming soon'
  const location = event?.location || 'Details coming soon'

  return (
    <section className="event-section section" id="events" aria-labelledby="next-event-heading">
      <PageShell>
        <div className="event-panel">
          <div className="event-image-wrap">
            <Image
              src="/images/home/wildcat-carnival.webp"
              alt="Young people and volunteers doing a hands-on activity outdoors at a community event"
              fill
              sizes="(max-width: 980px) 100vw, 50vw"
            />
            <span className="photo-note">A look at one of our community events</span>
          </div>
          <div className="event-copy">
            <p className="eyebrow">What&apos;s happening next</p>
            <h2 id="next-event-heading" className="family-heading">Our next family STEM event</h2>
            {event ? <h3 className="event-title family-heading">{event.title}</h3> : null}
            <p className="event-intro">
              {event?.summary || 'We’ll share the activity, age guidance, schedule, location, and registration details as soon as they’re confirmed.'}
            </p>
            <dl className="event-details">
              <div>
                <dt>When</dt>
                <dd>{event ? detail(when) : 'Details coming soon'}</dd>
              </div>
              <div>
                <dt>Where</dt>
                <dd>{event ? location : 'Details coming soon'}</dd>
              </div>
              <div>
                <dt>For</dt>
                <dd>Students and their families</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-4">
              {event ? (
                <Link className="text-link focus-ring" href={`/events/${event.slug}`}>
                  See event details <ArrowRight aria-hidden="true" />
                </Link>
              ) : null}
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
