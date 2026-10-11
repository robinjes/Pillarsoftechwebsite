import Link from 'next/link'

import { PageShell } from '@/components/site/FamilyPrimitives'

export default function ContactCta() {
  return (
    <section className="contact-section section" id="contact" aria-labelledby="contact-heading">
      <PageShell className="contact-panel">
        <div>
          <p className="eyebrow">Questions are always welcome</p>
          <h2 id="contact-heading" className="family-heading">
            <span className="contact-heading__line">Have a question?</span>
            <span className="contact-heading__line">We’d love to hear from you.</span>
          </h2>
          <p>
            Ask us about an event, volunteering, or bringing an activity to your school. We’re happy to help you find a place to start.
          </p>
        </div>
        <Link href="/contact" className="button button--navy focus-ring">Contact Pillars of Tech</Link>
      </PageShell>
    </section>
  )
}
