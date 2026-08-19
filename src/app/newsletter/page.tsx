import Image from 'next/image'
import type { Metadata } from 'next'
import { ArrowUpRight, CalendarDays, Lightbulb, Users } from 'lucide-react'
import {
  newsletterEmbedUrl,
  newsletterPageDescription,
  newsletterSignupUrl,
  newsletterWebsiteUrl,
} from '@/data/newsletter'
import ExternalEmbedOptIn from '@/components/ExternalEmbedOptIn'

export const metadata: Metadata = {
  title: 'Newsletter | Pillars of Tech',
  description: 'Sign up for the Pillars of Tech Sunday newsletter.',
}

const highlights = [
  { title: 'Weekly updates', description: 'Notes about the work, what is being taught, and what is coming next.', icon: CalendarDays },
  { title: 'STEM spotlights', description: 'Simple STEM ideas and topics for students and families to explore.', icon: Lightbulb },
  { title: 'Upcoming events', description: 'Event notes, opportunities to join, and ways to stay involved.', icon: Users },
] as const

export default function NewsletterPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] text-[var(--ink)]">
      <header className="border-b border-[var(--ink)]/20">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <div className="grid gap-8 border-y border-[var(--ink)]/25 py-8 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:gap-16">
            <div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-body text-sm font-semibold text-[var(--cobalt)]">
                <span>Sunday dispatch</span>
                <span className="text-[var(--ink)]/40" aria-hidden="true">/</span>
                <span>Field notes for curious builders</span>
              </div>
              <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.98] text-[var(--midnight)] sm:text-7xl">A small note for the week ahead.</h1>
            </div>
            <div className="max-w-md lg:justify-self-end">
              <p className="font-body text-base leading-7 text-[var(--ink)]/70 sm:text-lg">{newsletterPageDescription}</p>
              <a
                href={newsletterSignupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex min-h-11 items-center gap-2 bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
              >
                Open the signup form
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </div>
          <figure className="relative mt-8 aspect-[16/7] overflow-hidden border border-[var(--ink)]/25 bg-[var(--midnight)] sm:mt-10">
            <Image
              src="/images/events/wildcat-carnival/drive-04.webp"
              alt="Two children handle a white stretchy mixture over a pink bowl during a Wildcat Carnival activity."
              fill
              priority
              sizes="(min-width: 1024px) 90vw, 100vw"
              className="object-cover object-center"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--midnight)]/85 px-4 py-3 font-body text-xs leading-5 text-[var(--cream)]">
              An experiment worth writing down, from a real community workshop.
            </figcaption>
          </figure>
        </div>
      </header>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="mb-8 flex flex-col gap-4 border-b border-[var(--ink)]/30 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-body text-sm font-semibold text-[var(--cobalt)]">Subscribe</p>
              <h2 className="mt-2 font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Read it where it is easiest.</h2>
            </div>
            <a
              href={newsletterSignupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--midnight)] hover:text-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
            >
              Use the form directly
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          <div className="border border-[var(--ink)]/25 bg-[var(--cream)] p-2 sm:p-3">
            <ExternalEmbedOptIn
              src={newsletterEmbedUrl}
              title="Pillars of Tech newsletter signup form"
              directLabel="Use the form directly"
              loadLabel="Load signup form"
              description="This optional Google Form loads only after you choose to view it here."
              fallbackCopy="If the embedded form does not load, use the direct signup link above or visit the newsletter homepage."
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 font-body text-sm font-bold">
            <a
              href={newsletterWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-[var(--cobalt)] underline decoration-2 underline-offset-4 transition hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]"
            >
              Visit the newsletter homepage
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a
              href={newsletterSignupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-[var(--cobalt)] underline decoration-2 underline-offset-4 transition hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]"
            >
              Open signup in a new tab
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[var(--midnight)] text-[var(--cream)]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-0 border-y border-[var(--sky)]/30 md:grid-cols-3">
            {highlights.map((highlight) => {
              const Icon = highlight.icon

              return (
                <div key={highlight.title} className="border-b border-[var(--sky)]/30 px-0 py-7 last:border-b-0 md:border-b-0 md:border-r md:px-7 md:py-2 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                  <Icon aria-hidden="true" className="h-6 w-6 text-[var(--sky)]" strokeWidth={1.7} />
                  <h2 className="mt-5 font-display text-2xl text-[var(--cream)]">{highlight.title}</h2>
                  <p className="mt-3 max-w-xs font-body text-sm leading-6 text-[var(--cream)]/70">{highlight.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
