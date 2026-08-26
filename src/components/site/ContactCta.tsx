import Link from 'next/link'

import { PageShell } from '@/components/site/FamilyPrimitives'

export default function ContactCta() {
  return (
    <section className="contact-section section" id="contact" aria-labelledby="contact-heading">
      <PageShell className="contact-panel">
        <div>
          <p className="eyebrow">Questions are always welcome</p>
          <h2 id="contact-heading" className="family-heading">Not sure where to start? Talk with a real person.</h2>
          <p>
            Parents, students, educators, and volunteers can reach out. We&apos;ll help you understand the next step in plain language.
          </p>
        </div>
        <Link href="/contact" className="button button--navy focus-ring">Contact Pillars of Tech</Link>
      </PageShell>
    </section>
  )
}
