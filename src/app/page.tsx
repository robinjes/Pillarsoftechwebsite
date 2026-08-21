import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, MapPin, MoveUpRight } from 'lucide-react'

import AudienceRoutes from '@/components/site/AudienceRoutes'
import ImpactMetrics, { type PublicMetric } from '@/components/site/ImpactMetrics'
import SignalPath from '@/components/site/SignalPath'
import SignalScanner from '@/components/site/SignalScanner'
import SupportLinks from '@/components/site/SupportLinks'
import type { PublicEvent } from '@/lib/content-contracts'
import { listPublicEvents, listPublicImpact } from '@/lib/content-repository'

function HeroSection() {
  return (
    <section className="signal-hero" aria-labelledby="hero-heading">
      <div className="signal-shell signal-hero__grid">
        <div className="signal-hero__copy">
          <p className="signal-mono signal-eyebrow">FIELD NOTE 001 / EAST BAY</p>
          <h1 id="hero-heading" className="signal-hero__title">
            Give students the tools. <em>Watch what they build.</em>
          </h1>
          <p className="signal-hero__lede">
            Pillars of Tech makes STEM tangible through student-led workshops, mentors, and room to try again.
          </p>
          <div className="signal-hero__actions">
            <Link href="/events" className="signal-button signal-button--orange">
              Find an event <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link href="/volunteer" className="signal-button signal-button--line">
              Join the crew <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
          <dl className="signal-hero__readout">
            <div><dt className="signal-mono">MODE</dt><dd>STUDENT-LED</dd></div>
            <div><dt className="signal-mono">METHOD</dt><dd>HANDS-ON</dd></div>
            <div><dt className="signal-mono">STATUS</dt><dd><span className="signal-status-dot" /> OPEN TO ALL</dd></div>
          </dl>
        </div>
        <SignalScanner />
      </div>
    </section>
  )
}

function ProcessSection() {
  return (
    <section className="signal-process" aria-labelledby="process-heading">
      <div className="signal-shell">
        <div className="signal-section-head">
          <div>
            <p className="signal-mono signal-eyebrow">THE METHOD / 02</p>
            <h2 id="process-heading">How the signal travels.</h2>
          </div>
          <p>Every workshop is a handoff: a question becomes a build, a failed test becomes a better idea, and a student becomes the next guide.</p>
        </div>
        <SignalPath />
      </div>
    </section>
  )
}

const proofImages = [
  {
    src: '/images/events/wildcat-carnival/drive-03.webp',
    alt: 'A student facilitator guides children through an Oobleck activity at Wildcat Carnival.',
    label: 'WILDCAT CARNIVAL / MIX',
    size: 'large',
  },
  {
    src: '/images/events/science-odyssey/drive-02.webp',
    alt: 'Students compare marshmallow structures at the Science Odyssey engineering table.',
    label: 'SCIENCE ODYSSEY / TEST',
    size: 'small',
  },
  {
    src: '/images/events/foil-boat-stockmens/drive-03.webp',
    alt: 'An older student helps children test a foil boat in a water tub at Stockmens Park.',
    label: 'STOCKMENS / FLOAT',
    size: 'small',
  },
  {
    src: '/images/events/wildcat-tank-altamont/drive-02.webp',
    alt: 'Wildcat Tank judges listen during a student presentation.',
    label: 'WILDCAT TANK / SHARE',
    size: 'wide',
  },
  {
    src: '/images/events/family-science-night-altamont/drive-02.webp',
    alt: 'An older student demonstrates a VEX robot to three younger students at Family Science Night.',
    label: 'FAMILY SCIENCE NIGHT / CONTROL',
    size: 'small',
  },
] as const

function RealWorkSection() {
  return (
    <section className="signal-proof" aria-labelledby="proof-heading">
      <div className="signal-shell">
        <div className="signal-section-head signal-section-head--dark">
          <div>
            <p className="signal-mono signal-eyebrow">ROOM TONE / 03</p>
            <h2 id="proof-heading">The work has fingerprints.</h2>
          </div>
          <Link href="/events" className="signal-text-link signal-text-link--light">See the event archive <ArrowUpRight aria-hidden="true" /></Link>
        </div>
        <div className="signal-proof__grid">
          {proofImages.map((photo) => (
            <figure key={photo.src} className={`signal-proof__photo signal-proof__photo--${photo.size}`}>
              <div className="signal-proof__image-wrap">
                <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 700px) 100vw, 50vw" />
              </div>
              <figcaption className="signal-mono">{photo.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

const archiveFallbackImages: Record<string, string> = {
  'family-science-night-altamont': '/images/events/family-science-night-altamont/drive-01.webp',
  'altamont-creek-open-house': '/images/events/altamont-creek-open-house/hero.png',
}

function eventImage(event: PublicEvent | null, fallback: string): { src: string; isEventOwned: boolean } {
  const ownedImage = event?.heroImage || event?.image
  if (ownedImage) return { src: ownedImage, isEventOwned: true }
  return { src: archiveFallbackImages[event?.id ?? ''] || fallback, isEventOwned: false }
}

function eventLabel(event: PublicEvent): string {
  if (event.status === 'upcoming' || event.status === 'ongoing') return 'NEXT ON THE SIGNAL'
  return 'RECENT TRANSMISSION'
}

function eventDate(event: PublicEvent): string {
  return event.date || event.startLabel || 'Date to be announced'
}

function EventSignalSection({ upcoming, completed }: { upcoming: PublicEvent | null; completed: PublicEvent | null }) {
  const items = [upcoming, completed].filter((event): event is PublicEvent => Boolean(event))

  return (
    <section className="signal-events" aria-labelledby="events-heading">
      <div className="signal-shell">
        <div className="signal-section-head">
          <div>
            <p className="signal-mono signal-eyebrow">OPEN CHANNEL / 04</p>
            <h2 id="events-heading">Come into the room.</h2>
          </div>
          <Link href="/events" className="signal-text-link">All events <ArrowUpRight aria-hidden="true" /></Link>
        </div>
        {items.length > 0 ? (
          <div className="signal-events__list">
            {items.map((event, index) => (
              <article key={event.id} className="signal-event-row">
                <div className="signal-event-row__index signal-mono">0{index + 1}</div>
                <div className="signal-event-row__image">
                  {(() => {
                    const image = eventImage(event, '/images/events/family-science-night-altamont/drive-01.webp')
                    return (
                      <>
                        <Image src={image.src} alt={image.isEventOwned ? (event.heroImageAlt || event.imageAlt || `${event.title} workshop evidence.`) : 'A recent Pillars of Tech workshop with students and volunteers.'} fill sizes="(max-width: 700px) 100vw, 25vw" />
                        {!image.isEventOwned ? <span className="signal-event-row__image-note signal-mono">Archive image · upcoming program details at right.</span> : null}
                      </>
                    )
                  })()}
                </div>
                <div className="signal-event-row__body">
                  <p className="signal-mono signal-event-row__label">{eventLabel(event)}</p>
                  <h3>{event.title}</h3>
                  <p className="signal-event-row__meta"><span>{eventDate(event)}</span><span><MapPin aria-hidden="true" />{event.location || 'Location to be announced'}</span></p>
                  <p className="signal-event-row__summary">{event.summary || event.description.split('\n\n')[0] || 'A hands-on STEM experience built with the community.'}</p>
                </div>
                <Link href={`/events/${event.slug}`} className="signal-event-row__link" aria-label={`Open ${event.title}`}><MoveUpRight aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="signal-empty">New events will appear here as they are confirmed. Follow the newsletter for the next signal.</p>
        )}
      </div>
    </section>
  )
}

function FinanceSection() {
  return (
    <section className="signal-finance" aria-labelledby="finance-heading">
      <div className="signal-shell signal-finance__grid">
        <div>
          <p className="signal-mono signal-eyebrow">TRUST / OPEN LEDGER</p>
          <h2 id="finance-heading">The books stay open.</h2>
          <p className="signal-finance__lede">Pillars of Tech is fiscally sponsored by Hack Club. Follow the public transaction record or help fund the next box of materials through HCB.</p>
          <div className="signal-finance__actions">
            <a href="https://hcb.hackclub.com/pillars-of-tech/transactions" target="_blank" rel="noreferrer" className="signal-button signal-button--light">View transparent finances <ArrowUpRight aria-hidden="true" /></a>
            <a href="https://hcb.hackclub.com/donations/start/pillars-of-tech" target="_blank" rel="noreferrer" className="signal-text-link signal-text-link--light">Support the work <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </div>
        <div className="signal-ledger" aria-label="How support moves through the organization">
          <div className="signal-ledger__top signal-mono"><span>IN</span><span>OUT</span></div>
          <div className="signal-ledger__line"><span className="signal-ledger__dot" /><span className="signal-ledger__rule" /><span className="signal-ledger__dot signal-ledger__dot--orange" /></div>
          <div className="signal-ledger__labels"><span>HCB</span><span>TOOLS / ROOMS / MENTORS</span></div>
          <p className="signal-ledger__note signal-mono">NO CARD DATA LIVES HERE</p>
        </div>
      </div>
    </section>
  )
}

function selectEvents(events: PublicEvent[]) {
  const upcoming = events.find((event) => event.status === 'upcoming' || event.status === 'ongoing') ?? null
  const completed = events.find((event) => event.id === 'family-science-night-altamont' && event.status === 'completed')
    ?? events.find((event) => event.status === 'completed')
    ?? null
  return { upcoming, completed }
}

export default async function Home() {
  const [events, metrics] = await Promise.all([
    listPublicEvents().catch(() => [] as PublicEvent[]),
    listPublicImpact().catch(() => [] as PublicMetric[]),
  ])
  const { upcoming, completed } = selectEvents(events)

  return (
    <main>
      <HeroSection />
      <ImpactMetrics metrics={metrics} />
      <ProcessSection />
      <EventSignalSection upcoming={upcoming} completed={completed} />
      <RealWorkSection />
      <AudienceRoutes />
      <FinanceSection />
      <SupportLinks />
    </main>
  )
}
