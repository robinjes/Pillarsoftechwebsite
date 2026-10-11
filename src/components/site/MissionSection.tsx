import Image from 'next/image'

import { PageShell } from '@/components/site/FamilyPrimitives'

const workAreas = [
  {
    number: '01',
    title: 'Hands-on events',
    text: 'Build, test, and see what happens. Your questions are welcome here.',
  },
  {
    number: '02',
    title: 'Someone to help',
    text: 'Our volunteers are right beside you when you want a hand.',
  },
  {
    number: '03',
    title: 'Learning in our community',
    text: 'A chance for kids and families to try something new together.',
  },
]

export default function MissionSection() {
  return (
    <section className="work-section section" id="our-work" aria-labelledby="our-work-heading">
      <PageShell className="work-layout">
        <div className="photo-collage" aria-label="Photos from Pillars of Tech events">
          <figure className="photo-main">
            <Image
              src="/images/home/family-science-night.webp"
              alt="Families gathered around a table for a hands-on science activity."
              fill
              sizes="(max-width: 980px) 100vw, 48vw"
            />
          </figure>
          <figure className="photo-small">
            <Image
              src="/images/home/science-odyssey.webp"
              alt="Students exploring a science demonstration together."
              fill
              sizes="(max-width: 980px) 52vw, 24vw"
            />
          </figure>
          <span className="collage-badge">Real events. Real curiosity.</span>
        </div>

        <div className="work-copy">
          <p className="eyebrow">What we do</p>
          <h2 id="our-work-heading" className="family-heading text-[var(--navy-950)]">Big ideas start with a little curiosity.</h2>
          <p>
            At Pillars of Tech, we try new things, solve problems, and learn together. Every activity gives young people a chance to see what they can do.
          </p>
          <ul className="work-list">
            {workAreas.map((area) => (
              <li key={area.number}>
                <span aria-hidden="true">{area.number}</span>
                <div>
                  <strong>{area.title}</strong>
                  <small>{area.text}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </PageShell>
    </section>
  )
}
