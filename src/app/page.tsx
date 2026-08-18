import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { listPublicEvents, listPublicImpact } from '@/lib/content-repository'
import type { PublicEvent } from '@/lib/content-contracts'
import AudienceRoutes from '@/components/site/AudienceRoutes'
import EventProof from '@/components/site/EventProof'
import FamilyScienceStory from '@/components/site/FamilyScienceStory'
import ImpactMetrics, { type PublicMetric } from '@/components/site/ImpactMetrics'
import SupportLinks from '@/components/site/SupportLinks'
import WorkshopAssembly from '@/components/site/WorkshopAssembly'

function HeroSection() {
  return (
    <section className="bg-cream" aria-labelledby="hero-heading">
      <div className="site-shell mx-auto px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:px-10 lg:pb-32 lg:pt-24">
        <div className="editorial-grid items-end gap-y-12">
          <div className="col-span-12 lg:col-span-7">
            <p className="mb-6 font-display text-sm font-bold uppercase tracking-[0.2em] text-cobalt">Hands-on STEM, made together</p>
            <h1 id="hero-heading" className="display-heading max-w-4xl text-6xl text-midnight sm:text-7xl lg:text-[7.5rem]">
              STEM belongs in every student’s hands.
            </h1>
            <p className="body-copy mt-8 text-lg text-ink/75 sm:text-xl">
              We bring students, families, schools, and communities into the same room to ask better questions and build what comes next.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/events" className="inline-flex min-h-12 items-center gap-2 border border-midnight bg-midnight px-5 text-sm font-bold text-warm transition-colors hover:bg-cobalt">
                Find an Event <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/volunteer" className="inline-flex min-h-12 items-center gap-2 border border-midnight px-5 text-sm font-bold text-midnight transition-colors hover:bg-sky">
                Volunteer <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            <figure className="relative aspect-[4/3] overflow-hidden border border-ink/30 bg-sky">
              <Image
                src="/Scienceoddyseycover.jpg"
                alt="Volunteers guide children building marshmallow structures at outdoor tables"
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
              <figcaption className="absolute bottom-0 left-0 border-t border-r border-ink/30 bg-cream px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-midnight">
                Science Odyssey · Hands-on engineering
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinanceSection() {
  return (
    <section className="bg-cobalt text-cream" aria-labelledby="finance-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="editorial-grid items-center gap-y-8">
          <div className="col-span-12 lg:col-span-7">
            <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-cream">Open by design</p>
            <h2 id="finance-heading" className="display-heading max-w-3xl text-4xl sm:text-5xl">See the public record.</h2>
            <p className="body-copy mt-6 text-lg leading-8 text-cream">
              Pillars of Tech is fiscally sponsored by Hack Club. Our public transaction ledger is the clearest place to follow the financial activity behind this work.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <a
              href="https://hcb.hackclub.com/pillars-of-tech/transactions"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center gap-2 border border-cream px-5 text-sm font-bold text-cream transition-colors hover:bg-sky hover:text-midnight"
            >
              Open HCB transactions <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <p className="mt-4 text-sm leading-6 text-cream">External source · Hack Club bank</p>
          </div>
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
      <WorkshopAssembly />
      <EventProof upcoming={upcoming} completed={completed} />
      <FamilyScienceStory />
      <AudienceRoutes />
      <FinanceSection />
      <SupportLinks />
    </main>
  )
}
