import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { listPublicEvents, listPublicImpact } from '@/lib/content-repository'
import type { PublicEvent } from '@/lib/content-contracts'
import AudienceRoutes from '@/components/site/AudienceRoutes'
import EventProof from '@/components/site/EventProof'
import FamilyScienceStory from '@/components/site/FamilyScienceStory'
import HeroMotion, { HeroMotionText } from '@/components/site/HeroMotion'
import HeroVisual from '@/components/site/HeroVisual'
import ImpactMetrics, { type PublicMetric } from '@/components/site/ImpactMetrics'
import SupportLinks from '@/components/site/SupportLinks'
import WorkshopAssembly from '@/components/site/WorkshopAssembly'

function HeroSection() {
  return (
    <section className="hero-workshop bg-warm text-midnight" aria-labelledby="hero-heading">
      <HeroMotion>
        <div className="site-shell mx-auto px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:px-10 lg:pb-32 lg:pt-24">
          <div className="editorial-grid items-center gap-y-14 lg:gap-y-16">
            <HeroMotionText className="col-span-12 lg:col-span-6">
              <p className="eyebrow text-cobalt">Hands-on STEM learning</p>
              <h1 id="hero-heading" aria-label="STEM belongs in every student’s hands." className="display-heading mt-5 max-w-[11ch] text-[3rem] text-midnight sm:text-[3.65rem] lg:text-[4.35rem]">
                <span className="block">STEM belongs</span>
                <span className="block text-cobalt">in every student’s hands.</span>
              </h1>
              <p className="body-copy mt-7 max-w-xl text-lg text-ink/70 sm:text-xl">
                We make STEM practical, welcoming, and open to more young people through events, mentorship, and community.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/events" className="inline-flex min-h-12 items-center gap-2 border border-midnight bg-midnight px-5 text-sm font-bold text-warm transition-colors hover:border-cobalt hover:bg-cobalt">
                  Explore events <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/volunteer" className="inline-flex min-h-12 items-center gap-2 border border-midnight/35 px-5 text-sm font-bold text-midnight transition-colors hover:border-midnight hover:bg-cream">
                  Volunteer <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-10 max-w-md border-l-2 border-sky pl-4 text-sm leading-6 text-ink/60">
                For students, families, schools, and neighbors who want to make something real.
              </p>
            </HeroMotionText>

            <div className="col-span-12 lg:col-span-6 lg:col-start-7">
              <HeroVisual />
            </div>
          </div>
        </div>
      </HeroMotion>
    </section>
  )
}

function FinanceSection() {
  return (
    <section className="bg-sky text-midnight" aria-labelledby="finance-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="editorial-grid items-center gap-y-8">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow mb-4 text-cobalt">Open by design</p>
            <h2 id="finance-heading" className="display-heading max-w-3xl text-4xl sm:text-5xl">See the public record.</h2>
            <p className="body-copy mt-6 text-lg leading-8 text-midnight/75">
              Pillars of Tech is fiscally sponsored by Hack Club. Our public transaction ledger is the clearest place to follow the financial activity behind this work.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <a
              href="https://hcb.hackclub.com/pillars-of-tech/transactions"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center gap-2 border border-midnight bg-midnight px-5 text-sm font-bold text-warm transition-colors hover:bg-cobalt"
            >
              Open HCB transactions <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <p className="mt-4 text-sm leading-6 text-midnight/60">External source · Hack Club bank</p>
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
