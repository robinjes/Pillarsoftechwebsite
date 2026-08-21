import Image from 'next/image'
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

const programTaxonomy = [
  {
    title: 'STEM Events',
    description: 'Hands-on workshops and competitions give students a real question to investigate, build, and share.',
    image: '/images/events/science-odyssey/drive-02.webp',
    alt: 'Students compare and test marshmallow structures at a Science Odyssey engineering table.',
    href: '/events',
    action: 'Explore STEM events',
  },
  {
    title: 'Tech education & mentorship',
    description: 'Mentorship, practical resources, and patient guidance help students develop skills they can use next.',
    image: '/images/events/family-science-night/IMG_8332.JPG',
    alt: 'A Pillars of Tech volunteer and participant operate a VEX robot during Family Science Night.',
    href: '/team',
    action: 'Meet the team',
  },
  {
    title: 'Community Access',
    description: 'We help schools, families, and neighbors find a welcoming way to bring technology learning into their setting.',
    image: '/images/events/wildcat-carnival/drive-05.webp',
    alt: 'A student volunteer prepares an outdoor activity table at Wildcat Carnival.',
    href: '/contact',
    action: 'Start a conversation',
  },
] as const

function ProgramTaxonomy() {
  return (
    <section className="border-y border-ink/20 bg-paper" aria-labelledby="program-taxonomy-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="editorial-grid gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <p className="eyebrow text-cobalt">What we make possible</p>
            <h2 id="program-taxonomy-heading" className="display-heading mt-4 max-w-sm text-4xl sm:text-5xl">Three ways into STEM.</h2>
            <p className="body-copy mt-6 max-w-sm text-base leading-7 text-ink/70">
              Find the right first step, whether you want to join an event, learn with a mentor, or bring a practical program to your community.
            </p>
          </div>

          <div className="col-span-12 divide-y divide-ink/20 border-y border-ink/20 lg:col-span-8">
            {programTaxonomy.map((program, index) => (
              <article key={program.title} className="grid gap-6 py-7 sm:grid-cols-[8rem_1fr] sm:items-center lg:grid-cols-[10rem_1fr]">
                <div className="relative aspect-[4/3] overflow-hidden border border-ink/20 bg-cream">
                  <Image src={program.image} alt={program.alt} fill sizes="(max-width: 640px) 100vw, 10rem" className="object-cover" />
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                  <div>
                    <p className="font-body text-xs font-bold uppercase tracking-[0.16em] text-cobalt">0{index + 1}</p>
                    <h3 className="mt-2 font-display text-2xl leading-tight text-midnight sm:text-3xl">{program.title}</h3>
                    <p className="mt-3 max-w-xl font-body text-base leading-7 text-ink/70">{program.description}</p>
                  </div>
                  <Link href={program.href} className="inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-cobalt pb-1 font-body text-sm font-bold text-cobalt transition-colors hover:border-midnight hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-4 focus-visible:ring-offset-paper">
                    {program.action} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
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
      <ProgramTaxonomy />
      <FamilyScienceStory />
      <AudienceRoutes />
      <FinanceSection />
      <SupportLinks />
    </main>
  )
}
