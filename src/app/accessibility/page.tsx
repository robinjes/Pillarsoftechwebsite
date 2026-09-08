import type { Metadata } from 'next'
import Link from 'next/link'

import { ButtonLink, FriendlyCard, PageShell, SectionHeading } from '@/components/site/FamilyPrimitives'

export const metadata: Metadata = {
  title: 'Accessibility | Pillars of Tech',
  description: 'Accessibility commitments, known limitations, and a direct way to ask Pillars of Tech for help.',
}

export default function AccessibilityPage() {
  return (
    <main className="policy-page min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <section className="policy-hero section bg-[var(--midnight)] text-[var(--cream)]">
        <PageShell>
          <p className="eyebrow eyebrow--light">Accessibility</p>
          <h1 className="family-heading max-w-4xl text-5xl sm:text-6xl">A site that leaves room for questions.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--cream)]/80">We aim to make event information and contact paths readable, keyboard-friendly, and useful on the devices families already use. The protected contact form is currently available, and direct email is also supported.</p>
        </PageShell>
      </section>

      <section className="policy-section section bg-[var(--paper)]" aria-labelledby="accessibility-practices-heading">
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
              <p className="mt-4 text-base leading-7">We respect reduced motion through the prefers-reduced-motion setting, avoid autoplaying audio, and keep a useful poster or static state when motion is not wanted or cannot start.</p>
            </FriendlyCard>
            <FriendlyCard className="friendly-card--green !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Status is not color-only</h2>
              <p className="mt-4 text-base leading-7">Event, registration, and live-chat states use readable labels and status text in addition to color. Text alternatives stay available when media or an external panel cannot load.</p>
            </FriendlyCard>
          </div>
        </PageShell>
      </section>

      <section className="policy-section section bg-[var(--oat-light)]" aria-labelledby="accessibility-chat-heading">
        <PageShell>
          <SectionHeading
            eyebrow="Contact and chat availability"
            title="Support should be safe to use."
            description="The protected contact form is currently available, and direct email is also supported. Public live chat and the Discord reply bridge are not enabled yet, so there is no visitor chat dialog, office-hours queue, or reply path to depend on. If chat is considered in the future, it should provide a labelled dialog, live region, keyboard focus management, safety notice, and under-13 guardian notice before launch."
            id="accessibility-chat-heading"
          />
          <div className="family-card rounded-[2rem] bg-[var(--white)] p-7">
            <h2 className="family-heading text-2xl text-[var(--navy-950)]">Please keep unsafe details out of messages</h2>
            <p className="mt-4 max-w-3xl text-base leading-7">Do not share passwords, home addresses, school schedules, medical information, or emergency requests through the contact form. A parent or guardian can use the form for a child under 13. Use local emergency services for an emergency. Public live chat and the Discord reply bridge are not enabled yet, so there are no visitor chat files, voice/video calls, accounts, Discord invites or usernames, chatbot or AI replies, or response-time promise.</p>
            <p className="mt-4 max-w-3xl text-base leading-7">The protected contact form uses a validated server API and keeps messages in a bounded text-only path. No 30-day chat-retention job is running because public chat is not enabled. Direct email remains available when that is easier.</p>
          </div>
        </PageShell>
      </section>

      <section className="policy-section section bg-[var(--sky)]" aria-labelledby="accessibility-limits-heading">
        <PageShell>
          <SectionHeading
            eyebrow="Known limitations"
            title="Tell us what got in the way."
            description="Some external forms, embedded media, third-party pages, and older event records may not meet every accessibility need. We cannot promise that every partner-controlled surface will be accessible or available. If a page, event detail, or media item is hard to use, contact us and we will help find a workable path."
            id="accessibility-limits-heading"
          />
          <div className="policy-actions">
            <ButtonLink href="/contact" variant="navy">Ask For Accessibility Help</ButtonLink>
            <Link href="/privacy" className="inline-flex min-h-11 items-center rounded-full border-2 border-[var(--navy-950)] px-4 py-3 font-display font-bold text-[var(--navy-950)]">Read The Privacy Note</Link>
          </div>
        </PageShell>
      </section>
    </main>
  )
}
