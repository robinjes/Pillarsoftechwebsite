import Image from 'next/image'

import { PageShell } from '@/components/site/FamilyPrimitives'

const workAreas = [
  {
    number: '01',
    title: 'Hands-on events',
    text: 'Activities made for trying, testing, and asking questions.',
  },
  {
    number: '02',
    title: 'Supportive mentorship',
    text: 'Friendly volunteers who explain things without the jargon.',
  },
  {
    number: '03',
    title: 'Community access',
    text: 'More ways for students and families to discover what is possible.',
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
          <h2 id="our-work-heading" className="family-heading text-5xl text-[var(--navy-950)]">Learning feels different when you get to make something.</h2>
          <p>
            Pillars of Tech creates welcoming places where young people can explore STEM by doing—not by already knowing all the answers.
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
