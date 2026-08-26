import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { PageShell } from '@/components/site/FamilyPrimitives'

const proofPhotos = [
  {
    src: '/images/home/family-science-night.webp',
    alt: 'Families gathered around a table for a hands-on science activity.',
    caption: 'Family Science Night',
    className: 'event-proof-photo event-proof-photo--large',
  },
  {
    src: '/images/home/science-odyssey.webp',
    alt: 'Students exploring a science demonstration together.',
    caption: 'Science Odyssey',
    className: 'event-proof-photo event-proof-photo--small',
  },
  {
    src: '/images/home/wildcat-carnival.webp',
    alt: 'Young people and volunteers doing a hands-on activity outdoors at a community event.',
    caption: 'Wildcat Carnival',
    className: 'event-proof-photo event-proof-photo--wide',
  },
]

export default function EventProof() {
  return (
    <section className="event-proof-section section" aria-labelledby="event-proof-heading">
      <PageShell>
        <div className="event-proof-heading section-heading">
          <p className="eyebrow">Real events, real curiosity</p>
          <h2 id="event-proof-heading" className="family-heading">Learning lives in the room.</h2>
          <p>A few frames from the hands-on work already underway.</p>
        </div>

        <div className="event-proof-grid" data-event-proof>
          {proofPhotos.map((photo) => (
            <figure key={photo.src} className={photo.className}>
              <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 720px) 100vw, 38vw" />
              <figcaption>{photo.caption}</figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/events" className="text-link focus-ring">
            Browse all events <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link href="/photos/wildcat-tank" className="text-link focus-ring">
            See more photos <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </PageShell>
    </section>
  )
}
