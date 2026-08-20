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
    <section className="hero-workshop bg-midnight text-warm" aria-labelledby="hero-heading">
      <HeroMotion>
        <div className="site-shell mx-auto px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:px-10 lg:pb-24 lg:pt-24">
          <div className="editorial-grid items-center gap-y-12">
            <HeroMotionText className="col-span-12 lg:col-span-6">
              <h1 id="hero-heading" aria-label="STEM belongs in every student’s hands." className="display-heading max-w-[11ch] text-[3rem] text-warm sm:text-[3.65rem] lg:text-[4.35rem]">
                <span className="block">STEM belongs</span>
                <span className="block text-sky">in every student’s hands.</span>
              </h1>
              <p className="body-copy mt-7 max-w-xl text-lg text-warm/75 sm:text-xl">
                We make STEM practical, welcoming, and open to more young people through events, mentorship, and community.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/events" className="inline-flex min-h-12 items-center gap-2 border border-sky bg-sky px-5 text-sm font-bold text-midnight transition-colors hover:bg-warm">
                  Find an Event <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/volunteer" className="inline-flex min-h-12 items-center gap-2 border border-warm/70 px-5 text-sm font-bold text-warm transition-colors hover:bg-warm hover:text-midnight">
                  Volunteer <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="hero-build-cycle mt-10 max-w-xl" aria-label="Our build cycle: question, build, test, share">
                <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.2em] text-sky">The build cycle</p>
                <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-x-3">
                  <li className="hero-build-cycle__step">
                    <span className="hero-build-cycle__verb">QUESTION</span>
                    <span className="hero-build-cycle__detail">Choose a problem.</span>
                  </li>
                  <li className="hero-build-cycle__step">
                    <span className="hero-build-cycle__verb">BUILD</span>
                    <span className="hero-build-cycle__detail">Make a prototype.</span>
                  </li>
                  <li className="hero-build-cycle__step">
                    <span className="hero-build-cycle__verb">TEST</span>
                    <span className="hero-build-cycle__detail">Try it, notice, adjust.</span>
                  </li>
                  <li className="hero-build-cycle__step">
                    <span className="hero-build-cycle__verb">SHARE</span>
                    <span className="hero-build-cycle__detail">Teach it forward.</span>
                  </li>
                </ol>
              </div>
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
