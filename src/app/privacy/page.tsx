import type { Metadata } from 'next'
import Link from 'next/link'

import { ButtonLink, FriendlyCard, PageShell, SectionHeading } from '@/components/site/FamilyPrimitives'

export const metadata: Metadata = {
  title: 'Privacy | Pillars of Tech',
  description: 'A plain-language explanation of what Pillars of Tech collects, protects, and does not promise.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <section className="section bg-[var(--midnight)] text-[var(--cream)]">
        <PageShell>
          <p className="eyebrow eyebrow--light">Privacy and safety</p>
          <h1 className="family-heading max-w-4xl text-5xl sm:text-6xl">A clear note about your information.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--cream)]/80">We keep public pages useful and contact paths bounded. This page explains the choices and limitations that matter when you contact Pillars of Tech or use live chat.</p>
        </PageShell>
      </section>

      <section className="section bg-[var(--paper)]" aria-labelledby="privacy-collection-heading">
        <PageShell>
          <SectionHeading
            eyebrow="What we ask for"
            title="Only the details needed to help."
            description="The protected contact form asks for your name, email, subject, and message. Live chat requires a display name and accepts an optional email. We use those details to support the conversation you started."
            id="privacy-collection-heading"
          />

          <div className="grid gap-5 lg:grid-cols-3">
            <FriendlyCard className="friendly-card--sky !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Keep sensitive details out</h2>
              <p className="mt-4 text-base leading-7">Please do not send passwords, home addresses, school schedules, medical information, or emergency requests in contact or chat messages.</p>
            </FriendlyCard>
            <FriendlyCard className="friendly-card--peach !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Under 13? Ask a guardian</h2>
              <p className="mt-4 text-base leading-7">Visitors under 13 should ask a parent or guardian before using live chat. After-hours contact uses the email form and requires an email address.</p>
            </FriendlyCard>
            <FriendlyCard className="friendly-card--green !min-h-0 p-6">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Messages stay text-only</h2>
              <p className="mt-4 text-base leading-7">Chat v1 has no file uploads, voice or video calls, visitor accounts, Discord invites or usernames, public Discord access, chatbot or AI replies, or response-time promise.</p>
            </FriendlyCard>
          </div>
        </PageShell>
      </section>

      <section className="section bg-[var(--oat-light)]" aria-labelledby="privacy-protection-heading">
        <PageShell>
          <SectionHeading
            eyebrow="How chat is protected"
            title="A small, bounded connection."
            description="Anonymous and ordinary authenticated visitors use validated server APIs. They do not receive direct access to chat tables or staff destinations."
            id="privacy-protection-heading"
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="family-card rounded-[2rem] bg-[var(--white)] p-7">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Visitor token</h2>
              <p className="mt-4 text-base leading-7">A visitor conversation uses a random opaque token in an HttpOnly, SameSite=Lax, path-scoped cookie. It is Secure in production. We store only an HMAC or keyed hash using the server-side <code>CHAT_TOKEN_PEPPER</code>; the raw token is not stored.</p>
              <p className="mt-4 text-base leading-7">Contact and chat inputs use strict validation, same-origin checks, honeypots, bounded plain text, server-owned destinations, and durable rate limits. Messages render only as text; token comparisons use constant-time handling where applicable.</p>
            </article>
            <article className="family-card rounded-[2rem] bg-[var(--white)] p-7">
              <h2 className="family-heading text-2xl text-[var(--navy-950)]">Staff bridge and retention</h2>
              <p className="mt-4 text-base leading-7">Staff replies use a server-only application in one private <code>#website-live-chat</code> channel, with signed interactions and an active staff mapping. Visitor email is not placed in Discord message content.</p>
              <p className="mt-4 text-base leading-7">A protected daily retention job deletes completed or spam chats and their messages after 30 days. Open conversations are not deleted merely because they are old. We never log message bodies, emails, tokens, webhook URLs, Discord secrets, or service-role credentials.</p>
            </article>
          </div>
        </PageShell>
      </section>

      <section className="section bg-[var(--sky)]" aria-labelledby="privacy-limits-heading">
        <PageShell>
          <SectionHeading
            eyebrow="Known limitations"
            title="What this page cannot promise."
            description="Live chat is available only when both the Monday–Friday, 4:00–10:00 PM Pacific schedule and an approved staff queue toggle say it is open. The schedule closes after 10:00 PM. There is no guaranteed response time, and an emergency should use local emergency services."
            id="privacy-limits-heading"
          />
          <div className="flex flex-wrap items-center gap-4">
            <ButtonLink href="/contact" variant="navy">Contact the team</ButtonLink>
            <Link href="/accessibility" className="font-display font-bold text-[var(--navy-950)] underline underline-offset-4">Read accessibility commitments</Link>
          </div>
        </PageShell>
      </section>
    </main>
  )
}
