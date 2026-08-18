import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const audiences = [
  { title: 'Students & families', text: 'Find a welcoming place to test an idea, ask a question, and build something together.', href: '/events', action: 'Find an event' },
  { title: 'Volunteers', text: 'Bring your time, curiosity, and care to the rooms where hands-on learning happens.', href: '/volunteer', action: 'Volunteer with us' },
  { title: 'Schools & community groups', text: 'Host a practical STEM experience designed around your students and your space.', href: '/contact?reason=workshop', action: 'Start a conversation' },
  { title: 'Donors & supporters', text: 'Help keep materials, mentors, and open-ended making within reach.', href: '/fundraiser', action: 'Support the work' },
]

export default function AudienceRoutes() {
  return (
    <section className="bg-warm" aria-labelledby="audience-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="editorial-grid gap-y-8">
          <div className="col-span-12 lg:col-span-5">
            <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-cobalt">A place for you</p>
            <h2 id="audience-heading" className="display-heading text-4xl text-midnight sm:text-5xl">Choose your way in.</h2>
          </div>
          <p className="body-copy col-span-12 text-base text-ink/70 lg:col-span-6 lg:col-start-7">There is no single right way to join a STEM community. Start with the door that fits.</p>
        </div>

        <div className="mt-12 grid border-t border-ink/30 sm:grid-cols-2">
          {audiences.map((audience) => (
            <article key={audience.title} className="border-b border-ink/30 py-8 sm:px-6 sm:odd:border-r sm:first:pl-0 lg:px-10">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-midnight">{audience.title}</h3>
              <p className="mt-3 max-w-md text-base leading-7 text-ink/70">{audience.text}</p>
              <Link href={audience.href} className="mt-5 inline-flex min-h-11 items-center border-b-2 border-cobalt px-1 text-sm font-bold text-cobalt hover:border-midnight hover:text-midnight">
                {audience.action} <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
