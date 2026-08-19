import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const audiences = [
  { title: 'Students & families', text: 'Find a welcoming place to test an idea and build together.', href: '/events', action: 'Find an event' },
  { title: 'Volunteers', text: 'Bring your time and curiosity to the next workshop.', href: '/volunteer', action: 'Volunteer with us' },
  { title: 'Schools & community groups', text: 'Bring a practical STEM experience to your students.', href: '/contact?reason=workshop', action: 'Start a conversation' },
  { title: 'Donors & supporters', text: 'Help keep materials and mentors within reach.', href: '/fundraiser', action: 'Support the work' },
]

export default function AudienceRoutes() {
  return (
    <section className="bg-warm" aria-labelledby="audience-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="flex flex-col gap-5 border-b border-ink/30 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="audience-heading" className="display-heading max-w-xl text-4xl text-midnight sm:text-5xl">There is a place for your next idea.</h2>
          <p className="max-w-sm text-base leading-7 text-ink/70">Choose the path that fits.</p>
        </div>

        <div className="divide-y divide-ink/25">
          {audiences.map((audience, index) => (
            <article key={audience.title} className="grid gap-3 py-6 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
              <span className="font-display text-sm font-semibold text-cobalt" aria-hidden="true">0{index + 1}</span>
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-midnight">{audience.title}</h3>
                <p className="mt-1 max-w-xl text-base leading-7 text-ink/70">{audience.text}</p>
              </div>
              <Link href={audience.href} className="inline-flex min-h-11 items-center gap-2 border-b-2 border-cobalt px-1 text-sm font-bold text-cobalt hover:border-midnight hover:text-midnight sm:justify-self-end">
                {audience.action} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
