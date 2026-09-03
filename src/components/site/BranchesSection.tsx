import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { PageShell, SectionHeading, StatusPill } from '@/components/site/FamilyPrimitives'

export default function BranchesSection() {
  return (
    <section className="branches-section section" id="branches" aria-labelledby="branches-heading">
      <PageShell>
        <SectionHeading
          className="branches-heading"
          light
          eyebrow="Current and exploring"
          title="See where Pillars of Tech is active."
          description="California is our current public chapter. Georgia is an unpublished possibility pending approval; details will appear only after a chapter is approved and ready to share."
          id="branches-heading"
        />

        <div className="branch-grid">
          <article className="branch-card branch-card--california">
            <div>
              <p className="branch-kicker">Our first community</p>
              <h3 className="family-heading">California</h3>
              <p className="branch-description">Explore our work and family STEM events in California.</p>
            </div>
            <Link href="/events" className="focus-ring">
              See Current Events <ArrowUpRight aria-hidden="true" className="ml-2 h-4 w-4" />
            </Link>
          </article>

          <article className="branch-card branch-card--georgia" data-branch="ga">
            <div>
              <p className="branch-kicker">Exploratory — not yet published</p>
              <h3 className="family-heading">Georgia</h3>
              <p className="branch-description">There is no public Georgia chapter or event listing to join yet. Local details will be shared only after they are confirmed.</p>
            </div>
            <StatusPill>No public chapter yet</StatusPill>
          </article>
        </div>
      </PageShell>
    </section>
  )
}
