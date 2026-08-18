import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import type { PublicEvent } from '@/lib/content-contracts'
import { resolveEventImageAlt } from '@/lib/event-media'

function localPhoto(event: PublicEvent): string | null {
  const candidate = event.media.heroImage || event.media.image || event.heroImage || event.image
  if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//')) return null
  return candidate
}

function eventDate(event: PublicEvent): string {
  return event.date || event.startsAt || 'Date to be announced'
}

function EventRow({ event, label }: { event: PublicEvent; label: string }) {
  const photo = localPhoto(event)
  return (
    <article className="grid gap-6 border-b border-ink/30 py-8 md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] md:items-center md:gap-10">
      <div>
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-cobalt">{label}</p>
        <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-midnight sm:text-4xl">{event.title}</h3>
        <p className="mt-4 text-sm font-semibold text-ink/65">{eventDate(event)}{event.location ? ` · ${event.location}` : ''}</p>
        <p className="body-copy mt-5 text-base text-ink/75">{event.summary || event.description.split(/\n\n/)[0]}</p>
        <Link href={`/events/${event.slug}`} className="mt-6 inline-flex min-h-11 items-center border-b-2 border-cobalt px-1 text-sm font-bold text-cobalt hover:border-midnight hover:text-midnight">
          See the event story <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {photo ? (
        <div className="relative aspect-[4/3] overflow-hidden border border-ink/20 bg-cream">
          <Image src={photo} alt={resolveEventImageAlt(event, 'image', photo)} fill sizes="(max-width: 768px) 100vw, 384px" className="object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-end border border-ink/20 bg-sky p-5 text-sm font-semibold text-midnight">Photography will be added when a repository image is approved.</div>
      )}
    </article>
  )
}

export default function EventProof({ upcoming, completed }: { upcoming: PublicEvent | null; completed: PublicEvent | null }) {
  return (
    <section className="bg-cream" aria-labelledby="event-proof-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="editorial-grid gap-y-8">
          <div className="col-span-12 lg:col-span-5">
            <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-cobalt">Make it real</p>
            <h2 id="event-proof-heading" className="display-heading text-4xl text-midnight sm:text-5xl">Learning lives in the room.</h2>
          </div>
          <p className="body-copy col-span-12 text-base text-ink/70 lg:col-span-6 lg:col-start-7">
            Find the next gathering, then look back at what students and families have already made together.
          </p>
        </div>

        <div className="mt-10">
          {upcoming ? <EventRow event={upcoming} label="Next up" /> : (
            <div className="border-y border-ink/30 py-10 text-xl font-semibold text-midnight">Upcoming opportunities will appear here as they are confirmed.</div>
          )}
          {completed ? <EventRow event={completed} label="From the archive" /> : null}
        </div>
      </div>
    </section>
  )
}
