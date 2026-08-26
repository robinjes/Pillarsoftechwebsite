import { FriendlyCard, PageShell, SectionHeading } from '@/components/site/FamilyPrimitives'

const steps = [
  {
    number: '1',
    className: 'friendly-card--sky',
    title: 'Choose an event',
    text: 'See the activity, age guidance, location, and timing in plain language.',
    icon: <path d="M14 22h36v28H14zM22 14h20v8H22zM23 31h18M23 40h12" />,
  },
  {
    number: '2',
    className: 'friendly-card--peach',
    title: 'Show up curious',
    text: 'Bring your questions. We provide the materials and a friendly welcome.',
    icon: <path d="M19 50V23l13-9 13 9v27M25 50V36h14v14M17 50h30" />,
  },
  {
    number: '3',
    className: 'friendly-card--green',
    title: 'Build together',
    text: 'Kids try, make, and learn while volunteers help families along the way.',
    icon: <path d="M22 19h20v15H22zM17 49h30M22 34l-5 15M42 34l5 15M28 27h8M32 19v-7" />,
  },
]

export default function FamiliesIntro() {
  return (
    <section className="welcome-section section" id="families" aria-labelledby="families-heading">
      <PageShell>
        <SectionHeading
          className="section-heading--center"
          eyebrow="For parents, caregivers, and curious kids"
          title="New to tech? You&apos;re in the right place."
          description="You do not need to know how to code, build a robot, or use special equipment. We make every step clear and stay nearby to help."
          id="families-heading"
        />

        <div className="welcome-grid">
          {steps.map((step) => (
            <FriendlyCard key={step.number} className={step.className}>
              <span className="card-number" aria-hidden="true">{step.number}</span>
              <svg className="card-icon" viewBox="0 0 64 64" aria-hidden="true">
                {step.icon}
              </svg>
              <h3 className="family-heading text-3xl text-[var(--navy-950)]">{step.title}</h3>
              <p>{step.text}</p>
            </FriendlyCard>
          ))}
        </div>
      </PageShell>
    </section>
  )
}
