import type { Metadata } from 'next'
import Link from 'next/link'

import { ButtonLink, FriendlyCard, PageShell, SectionHeading } from '@/components/site/FamilyPrimitives'

export const metadata: Metadata = {
  title: 'Accessibility | Pillars of Tech',
  description: 'Accessibility commitments, known limitations, and a direct way to ask Pillars of Tech for help.',
}

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <section className="section bg-[var(--midnight)] text-[var(--cream)]">
        <PageShell>
          <p className="eyebrow eyebrow--light">Accessibility</p>
          <h1 className="family-heading max-w-4xl text-5xl sm:text-6xl">A site that leaves room for questions.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--cream)]/80">We aim to make event information and contact paths readable, keyboard-friendly, and useful on the devices families already use.</p>
        </PageShell>
      </section>

      <section className="section bg-[var(--paper)]" aria-labelledby="accessibility-practices-heading">
        <PageShell>
          <SectionHeading
            eyebrow="Our commitment"
            title="Readable by default, adaptable when needed."
            description="Public pages use Atkinson Hyperlegible for body copy and Fredoka for headings, visible focus states, high-contrast palette tokens, descriptive image text, and interactive targets sized for touch and keyboard use."
            id="accessibility-practices-heading"
          />
          <div className="grid gap-5 md:grid-cols-3">
            <FriendlyCard className="friendly-card--sky !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Keyboard paths</h2>
              <p className="mt-4 text-base leading-7">Menus, forms, disclosures, image viewers, and dialogs should have visible focus, a sensible tab order, Escape handling where appropriate, and focus returned to the control that opened a surface.</p>
            </FriendlyCard>
            <FriendlyCard className="friendly-card--peach !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Motion choices</h2>
              <p className="mt-4 text-base leading-7">We respect prefers-reduced-motion, avoid autoplaying audio, and keep a useful poster or static state when motion is not wanted or cannot start.</p>
            </FriendlyCard>
            <FriendlyCard className="friendly-card--green !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Status is not color-only</h2>
              <p className="mt-4 text-base leading-7">Event, registration, and live-chat states use readable labels and status text in addition to color. Text alternatives stay available when media or an external panel cannot load.</p>
            </FriendlyCard>
          </div>
        </PageShell>
      </section>

      <section className="section bg-[var(--oat-light)]" aria-labelledby="accessibility-chat-heading">
        <PageShell>
          <SectionHeading
            eyebrow="Live chat and privacy"
            title="Support should be safe to use."
            description="When chat is live, it requires a display name and accepts an optional email. A labelled dialog provides a live region for new replies, keyboard focus management, a safety notice, and an under-13 guardian notice. When scheduled_offline or closed, it shows Pacific office hours and the computed next opening and points to Leave a message through Contact."
            id="accessibility-chat-heading"
          />
          <div className="family-card rounded-[2rem] bg-[var(--white)] p-7">
            <h2 className="family-heading text-2xl text-[var(--navy-950)]">Please keep unsafe details out of chat</h2>
            <p className="mt-4 max-w-3xl text-base leading-7">Do not share passwords, home addresses, school schedules, medical information, or emergency requests. Chat v1 has no files, voice/video calls, visitor accounts, Discord invites or usernames, public Discord access, chatbot or AI replies, or response-time promise.</p>
            <p className="mt-4 max-w-3xl text-base leading-7">Messages render only as text. Contact and chat data is handled through validated server APIs, and completed or spam conversations are deleted after 30 days. Open conversations are not deleted merely because they are old.</p>
          </div>
        </PageShell>
      </section>

      <section className="section bg-[var(--sky)]" aria-labelledby="accessibility-limits-heading">
        <PageShell>
          <SectionHeading
            eyebrow="Known limitations"
            title="Tell us what got in the way."
            description="Some external forms, embedded media, third-party pages, and older event records may not meet every accessibility need. We cannot promise that every partner-controlled surface will be accessible or available. If a page, event detail, or media item is hard to use, contact us and we will help find a workable path."
            id="accessibility-limits-heading"
          />
          <div className="flex flex-wrap items-center gap-4">
            <ButtonLink href="/contact" variant="navy">Ask for accessibility help</ButtonLink>
            <Link href="/privacy" className="font-display font-bold text-[var(--navy-950)] underline underline-offset-4">Read the privacy note</Link>
          </div>
        </PageShell>
      </section>
    </main>
  )
}
