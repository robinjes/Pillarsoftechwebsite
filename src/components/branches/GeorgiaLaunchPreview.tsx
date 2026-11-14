import Link from 'next/link'
import { ArrowDown, ArrowUpRight } from 'lucide-react'

import styles from './GeorgiaLaunchPreview.module.css'

const invitations = [
  {
    audience: 'Families',
    description: 'Have a student who loves to build and tinker? Tell us what they’re curious about.',
    action: 'Contact us',
    href: '/contact',
  },
  {
    audience: 'Volunteers',
    description: 'Interested in helping students learn by doing? Tell us about your interests and background.',
    action: 'Offer to help',
    href: '/contact',
  },
  {
    audience: 'Schools and community groups',
    description: 'Thinking about hosting a workshop? Tell us about your group.',
    action: 'Start a conversation',
    href: '/contact?reason=partnerships',
  },
]

// A design preview only. This does not read, save, or publish a branch packet.
export default function GeorgiaLaunchPreview() {
  return (
    <article className={styles.page} aria-labelledby="georgia-launch-heading">
      <section className={styles.hero}>
        <div className={styles.introduction}>
          <p className="eyebrow">Georgia branch</p>
          <h1 id="georgia-launch-heading" className={`family-heading ${styles.headline}`}>
            Pillars of Tech is coming to <span>Georgia soon.</span>
          </h1>
          <p className={styles.lead}>
            We’re preparing to bring hands-on STEM learning to students in Georgia. The branch is still taking shape, so we’ll share details only once they’re confirmed.
          </p>
          <div className={styles.actions}>
            <Link href="/contact" className="button button--navy focus-ring">
              Contact us <ArrowUpRight aria-hidden="true" size={20} />
            </Link>
            <a href="#georgia-get-involved" className={styles.textLink}>
              Get involved <ArrowDown aria-hidden="true" size={18} />
            </a>
          </div>
        </div>

        <div className={styles.poster} aria-hidden="true">
          <span className={styles.posterBrand}>Pillars of Tech</span>
          <span className={styles.monogram}>GA<span className={styles.dot} /></span>
          <div className={styles.posterCaption}>
            <span>Georgia</span>
            <span>Launching soon</span>
          </div>
        </div>
      </section>

      <section className={styles.status} aria-labelledby="georgia-status-heading">
        <h2 id="georgia-status-heading" className="family-heading">Where things stand</h2>
        <p>The Georgia branch is in early preparation. We’ll share the date and location of our first event once they’re confirmed.</p>
      </section>

      <section id="georgia-get-involved" className={styles.involvement} aria-labelledby="georgia-involvement-heading">
        <h2 id="georgia-involvement-heading" className={`family-heading ${styles.sectionHeading}`}>There’s a place to start.</h2>
        <ul className={styles.invitations}>
          {invitations.map((invitation) => (
            <li key={invitation.audience} className={styles.invitation}>
              <h3 className="family-heading">{invitation.audience}</h3>
              <p>{invitation.description}</p>
              <Link href={invitation.href} className={styles.textLink} aria-label={`${invitation.action} — ${invitation.audience.toLowerCase()}`}>
                {invitation.action}
                <ArrowUpRight aria-hidden="true" size={20} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.contact} aria-labelledby="georgia-contact-heading">
        <div>
          <h2 id="georgia-contact-heading" className="family-heading">Say hello from Georgia.</h2>
          <p>Have a question or an idea? Send us a message and mention Georgia so we know where you’re writing from.</p>
        </div>
        <Link href="/contact" className={`button focus-ring ${styles.contactButton}`}>
          Contact us <ArrowUpRight aria-hidden="true" size={20} />
        </Link>
      </section>
    </article>
  )
}
