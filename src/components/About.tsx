import Link from 'next/link'
import { ArrowUpRight, BookOpen, Compass, Hammer, History } from 'lucide-react'

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

export default function About() {
  return (
    <div className="bg-[var(--cream)] text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.25fr_0.75fr] lg:px-12 lg:py-28">
          <div>
            <p className="mb-6 font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">
              About / Pillars of Tech
            </p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.96] tracking-tight text-[var(--midnight)] sm:text-7xl lg:text-[6.8rem]">
              Make room for the next idea.
            </h1>
          </div>
          <div className="self-end border-l-4 border-[var(--cobalt)] pl-6 lg:mb-2">
            <p className="font-body text-lg font-semibold leading-7 text-[var(--midnight)] sm:text-xl">
              Pillars of Tech is a student-led STEM organization building practical ways for students to meet technology.
            </p>
            <p className="mt-5 font-body text-sm leading-6 text-[var(--ink)]/70">
              We learn by making, share what we learn, and keep the door open for the next person.
            </p>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-24">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">The mission</p>
            <h2 className="mt-4 max-w-sm font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">
              Technology education should feel possible.
            </h2>
          </div>
          <div className="max-w-3xl space-y-6 font-body text-lg leading-8 text-[var(--ink)]/80">
            <p>
              We create opportunities for students to explore technology through accessible programs, useful tools, and patient guidance. The work is intentionally practical: start with a question, build something, and learn from what happens next.
            </p>
            <p>
              Pillars of Tech began as a student-led effort to make that kind of learning easier to find. Our current work stays close to that origin through hands-on events, mentorship, and an open invitation to participate.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-12 flex flex-col justify-between gap-5 border-b-2 border-[var(--ink)] pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">How we work</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Build, guide, invite.</h2>
            </div>
            <p className="max-w-sm font-body text-sm leading-6 text-[var(--ink)]/65">
              Three connected practices keep the experience grounded for students, families, and mentors.
            </p>
          </div>

          <div className="divide-y divide-[var(--ink)]/20 border-y border-[var(--ink)]/20">
            {workingMethods.map((method, index) => {
              const Icon = method.icon

              return (
                <div key={method.title} className="grid gap-5 py-7 sm:grid-cols-[5rem_0.8fr_1.2fr] sm:items-center">
                  <p className="font-body text-sm font-bold tabular-nums text-[var(--cobalt)]">0{index + 1}</p>
                  <div className="flex items-center gap-4">
                    <Icon aria-hidden="true" className="h-7 w-7 text-[var(--cobalt)]" strokeWidth={1.8} />
                    <h3 className="font-display text-2xl text-[var(--midnight)]">{method.title}</h3>
                  </div>
                  <p className="font-body text-base leading-7 text-[var(--ink)]/70">{method.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-[var(--midnight)] text-[var(--cream)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-24">
          <div>
            <div className="flex items-center gap-3 text-[var(--sky)]">
              <History aria-hidden="true" className="h-6 w-6" strokeWidth={1.7} />
              <p className="font-body text-xs font-bold uppercase tracking-[0.28em]">A living history</p>
            </div>
            <h2 className="mt-5 max-w-sm font-display text-4xl leading-tight sm:text-5xl">A small start, kept in motion.</h2>
          </div>
          <div className="border-l border-[var(--sky)]/40 pl-6 sm:pl-10">
            <div className="space-y-10 font-body text-base leading-7 text-[var(--cream)]/75 sm:text-lg">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--sky)]">The beginning</p>
                <p>Pillars of Tech grew from students asking how to make technology feel less distant and more hands-on.</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--sky)]">The practice now</p>
                <p>Events, mentorship, and community learning turn that question into a repeatable way to welcome people in.</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--sky)]">The next chapter</p>
                <p>We are continuing to listen, improve the work, and make the next invitation clearer than the last.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--cream)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-12 lg:py-20">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Financial home</p>
            <h2 className="mt-4 max-w-md font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Clear enough to follow.</h2>
          </div>
          <div className="border-t-2 border-[var(--ink)] pt-5 font-body text-base leading-7 text-[var(--ink)]/75">
            <p>
              <span className="font-bold text-[var(--midnight)]">Fiscally sponsored through Hack Club</span>, Pillars of Tech shares its HCB transaction record for financial transparency.
            </p>
            <a
              href={financeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 border-b-2 border-[var(--cobalt)] pb-1 font-bold text-[var(--cobalt)] transition-colors hover:border-[var(--midnight)] hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--cream)]"
            >
              Review HCB transactions
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[var(--sky)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-20">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--midnight)]/70">Keep exploring</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Find the next useful door.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/team"
              className="inline-flex min-h-11 items-center gap-2 border-2 border-[var(--midnight)] bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--midnight)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sky)]"
            >
              Meet the team
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/events"
              className="inline-flex min-h-11 items-center gap-2 border-2 border-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--midnight)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sky)]"
            >
              Explore events
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center border-2 border-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--midnight)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sky)]"
            >
              Start a conversation
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
