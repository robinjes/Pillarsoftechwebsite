import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import type { PublicEvent } from '@/lib/content-contracts'

function eventDate(event: PublicEvent): string {
  return event.date || event.startsAt || 'Date to be announced'
}

const proofPhotos = [
  {
    src: '/images/events/family-science-night-altamont/drive-04.webp',
    alt: 'An older student shows a child how to control a VEX robot at Family Science Night.',
    caption: 'Family Science Night · try it together',
    className: 'col-span-12 aspect-[4/3] sm:col-span-7 sm:aspect-[5/4] lg:col-span-5 lg:aspect-[4/3]',
  },
  {
    src: '/images/events/science-odyssey/drive-03.webp',
    alt: 'Completed marshmallow structures rest on engineering challenge sheets at Science Odyssey.',
    caption: 'Science Odyssey · test the structure',
    className: 'col-span-6 aspect-square sm:col-span-5 sm:aspect-square lg:col-span-3 lg:aspect-[4/5]',
  },
  {
    src: '/images/events/foil-boat-stockmens/drive-02.webp',
    alt: 'Students gather around water tubs to test hand-built foil boats at Stockmens Park.',
    caption: 'Stockmens Park · build for buoyancy',
    className: 'col-span-6 aspect-square sm:col-span-5 sm:aspect-square lg:col-span-4 lg:aspect-[5/4]',
  },
  {
    src: '/images/events/wildcat-carnival/drive-03.webp',
    alt: 'A student facilitator guides children through the Oobleck activity at Wildcat Carnival.',
    caption: 'Wildcat Carnival · learn by getting messy',
    className: 'col-span-12 aspect-[5/3] sm:col-span-7 sm:aspect-[5/3] lg:col-span-4 lg:aspect-[5/4]',
  },
]

export default function EventProof({ upcoming, completed }: { upcoming: PublicEvent | null; completed: PublicEvent | null }) {
  return (
    <section className="bg-cream" aria-labelledby="event-proof-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="event-proof-heading" className="display-heading max-w-xl text-4xl text-midnight sm:text-5xl">Learning lives in the room.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-ink/70">A few frames from the hands-on work already underway.</p>
          </div>
          <Link href="/events" className="inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-cobalt px-1 text-sm font-bold text-cobalt hover:border-midnight hover:text-midnight">
            Browse the archive <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-12 gap-3 sm:gap-4">
          {proofPhotos.map((photo) => (
            <figure key={photo.src} className={`relative overflow-hidden border border-ink/20 bg-sky ${photo.className}`}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 58vw, 40vw"
                className="object-cover motion-safe:transition motion-safe:duration-500 motion-safe:hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none motion-reduce:hover:scale-100"
              />
              <figcaption className="absolute bottom-0 left-0 max-w-[90%] border-t border-r border-ink/20 bg-cream px-3 py-2 text-xs font-semibold text-midnight">
                {photo.caption}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-12 grid gap-6 border-y border-ink/30 py-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-cobalt">Next chance to join in</p>
            {upcoming ? (
              <>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-midnight sm:text-3xl">{upcoming.title}</h3>
                <p className="mt-2 text-sm font-semibold text-ink/65">{eventDate(upcoming)}{upcoming.location ? ` · ${upcoming.location}` : ''}</p>
              </>
            ) : (
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-midnight">New events will appear here as they are confirmed.</h3>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {upcoming ? (
              <Link href={`/events/${upcoming.slug}`} className="inline-flex min-h-11 items-center gap-2 bg-midnight px-4 text-sm font-bold text-warm hover:bg-cobalt">
                Event details <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
            {completed ? (
              <Link href={`/events/${completed.slug}`} className="inline-flex min-h-11 items-center gap-2 border border-midnight px-4 text-sm font-bold text-midnight hover:bg-sky">
                Read a past story <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
