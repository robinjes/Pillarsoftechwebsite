import type { Metadata } from 'next'
import { ArrowUpRight, CalendarDays, Lightbulb, Users } from 'lucide-react'
import {
  newsletterEmbedUrl,
  newsletterPageDescription,
  newsletterSignupUrl,
  newsletterWebsiteUrl,
} from '@/data/newsletter'

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
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] pt-16 text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:px-12 lg:py-28">
          <div>
            <p className="mb-6 font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Newsletter / Sundays</p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.96] tracking-tight text-[var(--midnight)] sm:text-7xl lg:text-[6.8rem]">
              A small note for the week ahead.
            </h1>
          </div>
          <div className="border-l-4 border-[var(--cobalt)] pl-6">
            <p className="font-body text-lg leading-8 text-[var(--ink)]/75 sm:text-xl">{newsletterPageDescription}</p>
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
      </header>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-10 flex flex-col gap-4 border-b-2 border-[var(--ink)] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Subscribe</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Read it where it is easiest.</h2>
            </div>
            <a
              href={newsletterSignupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--midnight)] hover:text-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
            >
              Use the form directly
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          <div className="border-2 border-[var(--ink)]/25 bg-[var(--cream)] p-2 sm:p-3">
            <iframe
              src={newsletterEmbedUrl}
              title="Pillars of Tech newsletter signup form"
              width="100%"
              height="934"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              className="w-full"
              loading="lazy"
            >
              Loading the signup form…
            </iframe>
            <p className="border-t border-[var(--ink)]/20 px-3 py-3 font-body text-xs leading-5 text-[var(--ink)]/60">
              If the embedded form does not load, use the direct signup link above or visit the newsletter homepage.
            </p>
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
          <div className="grid gap-0 divide-y divide-[var(--sky)]/30 border-y border-[var(--sky)]/30 md:grid-cols-3 md:divide-x md:divide-y-0">
            {highlights.map((highlight) => {
              const Icon = highlight.icon

              return (
                <div key={highlight.title} className="px-0 py-7 md:px-7 md:py-2 first:md:pl-0 last:md:pr-0">
                  <Icon aria-hidden="true" className="h-6 w-6 text-[var(--sky)]" strokeWidth={1.7} />
                  <h2 className="mt-5 font-display text-2xl text-[var(--cream)]">{highlight.title}</h2>
                  <p className="mt-3 font-body text-sm leading-6 text-[var(--cream)]/70">{highlight.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
