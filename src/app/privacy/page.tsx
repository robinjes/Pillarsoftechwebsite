import type { Metadata } from 'next'
import Link from 'next/link'

import { ButtonLink, FriendlyCard, PageShell, SectionHeading } from '@/components/site/FamilyPrimitives'

export const metadata: Metadata = {
  title: 'Privacy | Pillars of Tech',
  description: 'A plain-language explanation of what Pillars of Tech collects, protects, and does not promise.',
}

export default function PrivacyPage() {
  return (
    <main className="policy-page min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <section className="policy-hero section bg-[var(--midnight)] text-[var(--cream)]">
        <PageShell>
          <p className="eyebrow eyebrow--light">Privacy and safety</p>
          <h1 className="family-heading max-w-4xl text-5xl sm:text-6xl">A clear note about your information.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--cream)]/80">We keep public pages useful and contact paths bounded. This page explains the choices and limitations that matter when you contact Pillars of Tech. The protected contact form is currently available, and direct email is also supported.</p>
        </PageShell>
      </section>

      <section className="policy-section section bg-[var(--paper)]" aria-labelledby="privacy-collection-heading">
        <PageShell>
          <SectionHeading
            eyebrow="What we ask for"
            title="Only the details needed to help."
            description="The currently available protected contact form asks for your name, email, subject, and message. Public live chat is not enabled yet, so we do not collect a visitor chat display name or email. Direct email remains available when that is easier. Public pages also provide visible keyboard focus and respect reduced motion when a visitor requests it."
            id="privacy-collection-heading"
          />

          <div className="grid gap-5 lg:grid-cols-3">
            <FriendlyCard className="friendly-card--sky !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Keep sensitive details out</h2>
              <p className="mt-4 text-base leading-7">Please do not send passwords, home addresses, school schedules, medical information, or emergency requests in contact messages. Use local emergency services for an emergency.</p>
            </FriendlyCard>
            <FriendlyCard className="friendly-card--peach !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Under 13? Ask a guardian</h2>
              <p className="mt-4 text-base leading-7">Visitors under 13 should ask a parent or guardian before sending a contact message. The protected contact form requires an email address so the team can follow up.</p>
            </FriendlyCard>
            <FriendlyCard className="friendly-card--green !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Messages stay text-only</h2>
              <p className="mt-4 text-base leading-7">Public live chat and the Discord reply bridge are not enabled yet. There are no visitor chat accounts, Discord invites or usernames, public Discord access, chatbot or AI replies, or response-time promise.</p>
            </FriendlyCard>
          </div>
        </PageShell>
      </section>

      <section className="policy-section section bg-[var(--oat-light)]" aria-labelledby="privacy-protection-heading">
        <PageShell>
          <SectionHeading
            eyebrow="How contact is protected"
            title="A small, bounded route."
            description="The currently available protected contact form uses a validated server API. Visitors do not receive direct access to contact data or staff destinations."
            id="privacy-protection-heading"
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="family-card rounded-[2rem] bg-[var(--white)] p-7">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Contact form boundary</h2>
              <p className="mt-4 text-base leading-7">Contact inputs use strict validation, same-origin checks, honeypots, bounded plain text, server-owned destinations, and durable rate limits. Messages render only as text, and the protected form does not expose private records to visitors.</p>
              <p className="mt-4 text-base leading-7">If a future visitor chat is approved, its design would use a random opaque token in an HttpOnly, SameSite=Lax, path-scoped cookie that is Secure in production, with only an HMAC or keyed hash stored server-side.</p>
            </article>
            <article className="family-card rounded-[2rem] bg-[var(--white)] p-7">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Deferred chat and retention</h2>
              <p className="mt-4 text-base leading-7">Public live chat and the Discord reply bridge are not enabled yet. No staffed queue, connected Discord destination, or visitor chat reply path is available. Direct email and the protected contact form are the supported visitor channels today.</p>
              <p className="mt-4 text-base leading-7">No chat-retention job that deletes messages after 30 days is running because public chat is not enabled. If a future service is approved, its retention, privacy, and security controls would be documented before launch. We do not log message bodies, emails, tokens, webhook URLs, Discord secrets, or service-role credentials.</p>
            </article>
          </div>
        </PageShell>
      </section>

      <section className="policy-section section bg-[var(--sky)]" aria-labelledby="privacy-limits-heading">
        <PageShell>
          <SectionHeading
            eyebrow="Known limitations"
            title="What this page cannot promise."
            description="Public live chat and the Discord reply bridge are not enabled yet. The protected contact form and direct email are the supported visitor channels today; there is no office-hours queue or guaranteed response time. An emergency should use local emergency services."
            id="privacy-limits-heading"
          />
          <div className="policy-actions">
            <ButtonLink href="/contact" variant="navy">Contact The Team</ButtonLink>
            <Link href="/accessibility" className="inline-flex min-h-11 items-center rounded-full border-2 border-[var(--navy-950)] px-4 py-3 font-display font-bold text-[var(--navy-950)]">Read Accessibility Commitments</Link>
          </div>
        </PageShell>
      </section>
    </main>
  )
}
