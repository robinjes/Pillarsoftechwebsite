import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const teamJoinUrl = 'https://forms.gle/XqeKkMF4cj5W62yL9'

const audiences = [
  { role: 'BUILDERS', title: 'Students & families', text: 'Find a welcoming place to test an idea and build together.', href: '/events', action: 'Find an event' },
  {
    role: 'CREW',
    title: 'Volunteers',
    text: 'Bring your time and curiosity to the next workshop.',
    href: '/volunteer',
    action: 'Volunteer with us',
    secondaryHref: teamJoinUrl,
    secondaryAction: 'Team application',
  },
  { role: 'HOSTS', title: 'Schools & community groups', text: 'Bring a practical STEM experience to your students.', href: '/contact?reason=workshop', action: 'Start a conversation' },
  { role: 'BACKERS', title: 'Donors & supporters', text: 'Help keep materials and mentors within reach.', href: '/fundraiser', action: 'Support the work' },
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
          {audiences.map((audience) => (
            <article key={audience.title} className="audience-route group grid gap-3 py-6 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
              <span className="audience-route__role font-display text-xs font-bold tracking-[0.16em] text-cobalt">{audience.role}</span>
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-midnight">{audience.title}</h3>
                <p className="mt-1 max-w-xl text-base leading-7 text-ink/70">{audience.text}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-self-end">
                <Link href={audience.href} className="inline-flex min-h-11 items-center gap-2 border-b-2 border-cobalt px-1 text-sm font-bold text-cobalt hover:border-midnight hover:text-midnight">
                  {audience.action} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                {'secondaryHref' in audience ? (
                  <a
                    href={audience.secondaryHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 border-b border-ink/35 px-1 text-xs font-bold text-ink/70 hover:border-midnight hover:text-midnight"
                  >
                    {audience.secondaryAction} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
