import Image from 'next/image'
import type { Metadata } from 'next'
import { ArrowUpRight, CalendarDays, Lightbulb, Send, Users } from 'lucide-react'
import {
  newsletterEmbedUrl,
  newsletterPageDescription,
  newsletterSignupUrl,
  newsletterWebsiteUrl,
} from '@/data/newsletter'
import ExternalEmbedOptIn from '@/components/ExternalEmbedOptIn'
import SignalPageIntro from '@/components/site/SignalPageIntro'

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
    <main className="min-h-screen overflow-x-hidden bg-[var(--bone)] text-[var(--carbon)]">
      <SignalPageIntro
        eyebrow="SUNDAY DISPATCH / 01"
        title="A small note for the week ahead."
        description={newsletterPageDescription}
        image={{
          src: '/images/events/wildcat-carnival/drive-05.webp',
          alt: 'A student volunteer prepares an outdoor activity table in late-afternoon light.',
        }}
        tone="bone"
        imagePosition="center"
        actions={(
          <a href={newsletterSignupUrl} target="_blank" rel="noopener noreferrer" className="signal-button signal-button--orange">
            Open the signup form
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </a>
        )}
      />

      <section className="border-b border-[var(--carbon)]/25 bg-[var(--off-white)]" aria-labelledby="dispatch-title">
        <div className="signal-shell grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:py-28">
          <div>
            <p className="signal-mono text-[var(--signal-orange)]">DISPATCH / 02 · SUBSCRIBE</p>
            <h2 id="dispatch-title" className="mt-4 max-w-md font-display text-4xl font-semibold leading-[0.92] tracking-[-0.055em] text-[var(--carbon)] sm:text-5xl">Read it where it is easiest.</h2>
            <p className="mt-5 max-w-md font-body text-base leading-7 text-[var(--carbon)]/68">The signup lives in the newsletter&apos;s own form. You can open it directly or load the optional panel when you are ready.</p>

            <div className="mt-8 border-y border-[var(--carbon)]/25 py-5">
              <p className="signal-mono text-[var(--ultramarine)]">ISSUE ROUTES</p>
              <div className="mt-4 flex flex-col items-start gap-2">
                <a href={newsletterWebsiteUrl} target="_blank" rel="noopener noreferrer" className="signal-text-link">
                  Visit the newsletter homepage
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </a>
                <a href={newsletterSignupUrl} target="_blank" rel="noopener noreferrer" className="signal-text-link">
                  Open signup in a new tab
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </a>
              </div>
            </div>

            <figure className="relative mt-8 aspect-[4/3] overflow-hidden border border-[var(--carbon)]/35 bg-[var(--mist)]">
              <Image
                src="/images/events/wildcat-carnival/drive-02.webp"
                alt="Students gather around a hands-on activity at the Wildcat Carnival."
                fill
                sizes="(min-width: 1024px) 28vw, 100vw"
                className="object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--carbon)]/85 px-3 py-2 signal-mono text-[var(--off-white)]">FIELD NOTES / EVERY SUNDAY</figcaption>
            </figure>
          </div>

          <div className="min-w-0 border border-[var(--carbon)]/35 bg-[var(--bone)] p-2 sm:p-3">
            <ExternalEmbedOptIn
              src={newsletterEmbedUrl}
              title="Pillars of Tech newsletter signup form"
              directLabel="Use the form directly"
              loadLabel="Load signup form"
              description="This optional Google Form loads only after you choose to view it here."
              fallbackCopy="If the embedded form does not load, use the direct signup link above or visit the newsletter homepage."
            />
          </div>
        </div>
      </section>

      <section className="bg-[var(--carbon)] text-[var(--off-white)]" aria-labelledby="dispatch-includes-title">
        <div className="signal-shell py-14 sm:py-20 lg:py-24">
          <div className="flex flex-col gap-5 border-b border-[var(--off-white)]/30 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="signal-mono text-[var(--signal-orange)]">WHAT ARRIVES / 03</p>
              <h2 id="dispatch-includes-title" className="mt-3 font-display text-4xl font-semibold leading-[0.93] tracking-[-0.05em] sm:text-5xl">Useful signal, once a week.</h2>
            </div>
            <Send aria-hidden="true" className="h-7 w-7 text-[var(--signal-orange)]" strokeWidth={1.6} />
          </div>

          <div className="mt-8 grid gap-0 border-y border-[var(--off-white)]/30 md:grid-cols-3">
            {highlights.map((highlight, index) => {
              const Icon = highlight.icon

              return (
                <article key={highlight.title} className="border-b border-[var(--off-white)]/30 py-7 last:border-b-0 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="signal-mono text-[var(--signal-orange)]">0{index + 1}</span>
                    <Icon aria-hidden="true" className="h-6 w-6 text-[var(--ultramarine)]" strokeWidth={1.7} />
                  </div>
                  <h3 className="mt-7 font-display text-2xl font-semibold leading-[0.95] tracking-[-0.04em]">{highlight.title}</h3>
                  <p className="mt-3 max-w-xs font-body text-sm leading-6 text-[var(--off-white)]/68">{highlight.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
