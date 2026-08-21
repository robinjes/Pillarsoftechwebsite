import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const audiences = [
  { role: '01 / BUILDERS', title: 'Students + families', text: 'Find a welcoming place to test an idea.', href: '/events', action: 'Find a room' },
  { role: '02 / CREW', title: 'Volunteers', text: 'Bring time, patience, and a useful pair of hands.', href: '/volunteer', action: 'Join the crew' },
  { role: '03 / HOSTS', title: 'Schools + partners', text: 'Put a practical STEM experience in your community.', href: '/contact?reason=workshop', action: 'Start a conversation' },
  { role: '04 / BACKERS', title: 'Donors + supporters', text: 'Keep tools and mentors within reach.', href: '/fundraiser', action: 'Back the work' },
]

export default function AudienceRoutes() {
  return (
    <section className="signal-routes" aria-labelledby="audience-heading">
      <div className="signal-shell">
        <div className="signal-section-head">
          <div>
            <p className="signal-mono signal-eyebrow">FIND YOUR PORT / 05</p>
            <h2 id="audience-heading">There is a way in.</h2>
          </div>
          <p>Different role, same signal. Pick the next useful thing.</p>
        </div>
        <div className="signal-routes__list">
          {audiences.map((audience) => (
            <article key={audience.title} className="signal-route">
              <span className="signal-route__role signal-mono">{audience.role}</span>
              <div className="signal-route__copy">
                <h3>{audience.title}</h3>
                <p>{audience.text}</p>
              </div>
              <Link href={audience.href} className="signal-route__link">{audience.action} <ArrowUpRight aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
