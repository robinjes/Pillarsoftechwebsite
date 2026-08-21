import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, BookOpen, Compass, Hammer, History } from 'lucide-react'
import SignalPageIntro from '@/components/site/SignalPageIntro'

const financeUrl = 'https://hcb.hackclub.com/pillars-of-tech/transactions'

const workingMethods = [
  {
    title: 'Hands-on events',
    description: 'Robotics, coding, and engineering activities give students something real to test, change, and explain.',
    icon: Hammer,
  },
  {
    title: 'Mentorship',
    description: 'Student leaders and mentors make room for questions, practice, and the confidence to keep going.',
    icon: Compass,
  },
  {
    title: 'Access',
    description: 'We design welcoming entry points into technology, with clear next steps for students and families.',
    icon: BookOpen,
  },
] as const

const workshopPhotos = [
  {
    src: '/images/events/altamont-creek-open-house/cover.png',
    alt: 'A student tries a hands-on activity while volunteers staff colorful classroom tables at Altamont Creek Open House.',
    caption: 'Altamont Creek Open House · test the idea',
  },
  {
    src: '/images/events/wildcat-tank-altamont/drive-01.webp',
    alt: 'A student presents a project to seated judges at Wildcat Tank.',
    caption: 'Wildcat Tank · present the idea',
  },
  {
    src: '/images/events/pedrozzi-connect-egg-drop/drive-01.webp',
    alt: 'Students and volunteers gather outdoors for the Pedrozzi CONNECT egg-drop activity.',
    caption: 'Pedrozzi CONNECT · learn and build together',
  },
] as const

const manualSections = [
  {
    number: '01',
    label: 'Our mission',
    title: 'Make room for the next idea.',
    copy: 'Pillars of Tech is a student-led STEM organization building practical ways for students to meet technology. We learn by making, share what we learn, and keep the door open for the next person.',
  },
  {
    number: '02',
    label: 'Method',
    title: 'Technology education should feel possible.',
    copy: 'Start with a question, build something, and learn from what happens next. Our events, mentorship, and community programs are designed around participation rather than performance.',
  },
  {
    number: '03',
    label: 'History',
    title: 'A small start, kept in motion.',
    copy: 'Pillars of Tech grew from students asking how to make technology feel less distant and more hands-on. The practice keeps moving through workshops, shared tools, and clearer invitations to participate.',
  },
] as const

export default function About() {
  return (
    <div className="bg-[var(--bone)] text-[var(--carbon)]">
      <SignalPageIntro
        eyebrow="ABOUT / OPERATING MANUAL"
        title="Make room for the next idea."
        description="Pillars of Tech is a student-led STEM organization building practical ways for students to meet technology. Read the short version of how the work operates, then find a real way into it."
        tone="carbon"
        image={{ src: workshopPhotos[0].src, alt: workshopPhotos[0].alt }}
        actions={
          <>
            <Link href="/events" className="signal-button signal-button--orange">
              Find an event <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link href="/volunteer" className="signal-button signal-button--light">
              Volunteer <ArrowUpRight aria-hidden="true" />
            </Link>
          </>
        }
      />

      <section className="border-b border-[var(--carbon)]/30 bg-[var(--bone)]" aria-labelledby="manual-heading">
        <div className="signal-shell py-16 sm:py-24">
          <div className="flex flex-col gap-5 border-b border-[var(--carbon)]/35 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="signal-mono signal-eyebrow">01 / THE MANUAL</p>
              <h2 id="manual-heading" className="mt-3 max-w-2xl font-display text-4xl leading-[0.98] tracking-[-0.045em] sm:text-5xl">
                What the work is built to do.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[var(--carbon)]/65">A plain-language guide to the mission, method, and history behind the programs.</p>
          </div>

          <div className="divide-y divide-[var(--carbon)]/25">
            {manualSections.map((section) => (
              <article key={section.number} className="grid gap-6 py-8 sm:grid-cols-[5rem_minmax(0,0.75fr)_minmax(0,1fr)] sm:gap-8 sm:py-10">
                <p className="signal-mono text-[var(--signal-orange)]">{section.number}</p>
                <div>
                  <p className="signal-mono text-[var(--ultramarine)]">{section.label}</p>
                  <h3 className="mt-3 max-w-md font-display text-3xl leading-[0.98] tracking-[-0.04em] sm:text-4xl">{section.title}</h3>
                </div>
                <p className="max-w-xl text-base leading-7 text-[var(--carbon)]/72">{section.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--carbon)]/30 bg-[var(--off-white)]" aria-labelledby="practice-heading">
        <div className="signal-shell py-16 sm:py-24">
          <div className="signal-section-head">
            <div>
              <p className="signal-mono signal-eyebrow">02 / THE PRACTICE</p>
              <h2 id="practice-heading">Build, guide, invite.</h2>
            </div>
            <p>Three connected practices keep the experience grounded for students, families, and mentors.</p>
          </div>

          <div className="mt-8 grid border-y border-[var(--carbon)]/30 md:grid-cols-3">
            {workingMethods.map((method, index) => {
              const Icon = method.icon

              return (
                <article key={method.title} className="border-b border-[var(--carbon)]/30 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="signal-mono text-[var(--signal-orange)]">0{index + 1}</span>
                    <Icon aria-hidden="true" className="h-6 w-6 text-[var(--ultramarine)]" strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-14 font-display text-2xl leading-none tracking-[-0.035em]">{method.title}</h3>
                  <p className="mt-4 text-sm leading-6 text-[var(--carbon)]/68">{method.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--off-white)]/25 bg-[var(--carbon)] py-16 text-[var(--off-white)] sm:py-24" aria-labelledby="evidence-heading">
        <div className="signal-shell">
          <div className="signal-section-head signal-section-head--dark">
            <div>
              <p className="signal-mono signal-eyebrow">03 / EVIDENCE</p>
              <h2 id="evidence-heading">The work leaves a trace.</h2>
            </div>
            <p>Three moments from the field—each one a different way students move from curiosity to participation.</p>
          </div>

          <div className="mt-10 grid grid-cols-12 items-start gap-3 sm:gap-4">
            {workshopPhotos.map((photo, index) => (
              <figure
                key={photo.src}
                className={`relative overflow-hidden border border-[var(--off-white)]/35 ${index === 0 ? 'col-span-8 aspect-[4/5] sm:col-span-5' : index === 1 ? 'col-span-4 mt-10 aspect-[4/5] sm:col-span-3 sm:mt-16' : 'col-span-9 col-start-4 -mt-5 aspect-[5/3] sm:col-span-7 sm:col-start-6 sm:-mt-14'}`}
              >
                <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 640px) 75vw, (max-width: 1024px) 38vw, 30vw" className="object-cover transition-transform duration-500 motion-safe:hover:scale-[1.04] motion-reduce:transition-none motion-reduce:hover:scale-100" />
                <figcaption className="absolute inset-x-0 bottom-0 border-t border-[var(--off-white)]/30 bg-[var(--carbon)]/90 px-3 py-2 text-xs font-semibold text-[var(--off-white)]">{photo.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--carbon)]/30 bg-[var(--ultramarine)] text-[var(--off-white)]" aria-labelledby="finance-heading">
        <div className="signal-shell grid gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-20">
          <div>
            <p className="signal-mono signal-eyebrow">04 / FINANCIAL HOME</p>
            <h2 id="finance-heading" className="mt-3 max-w-xl font-display text-4xl leading-[0.96] tracking-[-0.045em] sm:text-5xl">Clear enough to follow.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--off-white)]/78">
              <span className="font-bold text-[var(--off-white)]">Fiscally sponsored through Hack Club</span>, Pillars of Tech shares its HCB transaction record for financial transparency.
            </p>
            <a href={financeUrl} target="_blank" rel="noopener noreferrer" className="signal-button signal-button--light mt-7">
              Review HCB transactions <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
          <div className="border border-[var(--off-white)]/65 p-5">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--off-white)]/35 pb-3">
              <span className="signal-mono text-[var(--signal-orange)]">HCB / PUBLIC LEDGER</span>
              <History aria-hidden="true" className="h-5 w-5 text-[var(--signal-orange)]" />
            </div>
            <p className="mt-8 font-display text-3xl leading-none">Trace the record.</p>
            <p className="mt-3 text-sm leading-6 text-[var(--off-white)]/65">The external ledger is the source of truth for current financial details.</p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--signal-orange)]" aria-labelledby="about-next-heading">
        <div className="signal-shell flex flex-col gap-8 py-14 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="signal-mono text-[var(--carbon)]/70">05 / NEXT STEP</p>
            <h2 id="about-next-heading" className="mt-3 max-w-2xl font-display text-4xl leading-[0.96] tracking-[-0.045em] sm:text-5xl">Find the next useful door.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/team" className="signal-button signal-button--line">Meet the team <ArrowUpRight aria-hidden="true" /></Link>
            <Link href="/events" className="signal-button signal-button--line">Explore events <ArrowUpRight aria-hidden="true" /></Link>
            <Link href="/contact" className="signal-button signal-button--line">Start a conversation <ArrowUpRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
