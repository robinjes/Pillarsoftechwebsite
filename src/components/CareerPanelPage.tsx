import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, CalendarDays, ChevronDown, Clock3, MapPin } from 'lucide-react'
import type { PublicEvent } from '@/lib/content-contracts'
import { careerPanelAgenda, careerPanelists, publicEventLocation } from '@/lib/career-panel-details'
import CareerPanelLumaCheckout from '@/components/CareerPanelLumaCheckout'
import styles from './CareerPanelPage.module.css'

export default function CareerPanelPage({ event }: { event: PublicEvent }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/events" className={styles.back}><ArrowLeft size={18} aria-hidden="true" /> All events</Link>

        <div className={styles.layout}>
          <header className={styles.intro}>
            <p className={styles.eyebrow}>Pillars of Tech &amp; HOSA</p>
            <h1>{event.title}</h1>
            <p className={styles.lead}>Meet STEM professionals. Explore their paths. Find inspiration for yours.</p>
            <dl className={styles.facts}>
              <div><CalendarDays size={20} aria-hidden="true" /><dt className="sr-only">Date</dt><dd>{event.date || event.startLabel}</dd></div>
              <div><Clock3 size={20} aria-hidden="true" /><dt className="sr-only">Time</dt><dd>{event.time || '5:30 PM – 8:30 PM'} <span className={styles.timezone}>Pacific</span></dd></div>
              <div><MapPin size={20} aria-hidden="true" /><dt className="sr-only">Location</dt><dd>{publicEventLocation(event)}<span className={styles.city}>Livermore, CA</span></dd></div>
            </dl>
          </header>

          <aside className={styles.registration} aria-labelledby="career-registration-heading" id="career-registration">
            <div className={styles.registrationTop}>
              <h2 id="career-registration-heading">Join the Career Panel</h2>
              <span className={styles.free}>FREE admission</span>
            </div>
            <CareerPanelLumaCheckout event={event} className={styles.registerButton} />
            <p className={styles.audience}>For high school students &amp; 8th graders.<br />Food and drinks provided.</p>
            {event.volunteerRegistrationState === 'open' ? (
              <Link href={`/volunteer?eventId=${encodeURIComponent(event.slug || event.id)}`} className={styles.volunteer}>Volunteer at this event <ArrowUpRight size={16} aria-hidden="true" /></Link>
            ) : null}
            <figure className={styles.poster}>
              <Image src="/images/events/career-panel-granada/poster.png" alt="Career Panel hosted by Pillars of Tech and HOSA, October 28, 5:30–8:30 PM at Granada High School in Livermore, CA." width={800} height={800} sizes="(min-width: 1024px) 270px, (max-width: 640px) 90vw, 480px" />
            </figure>
          </aside>

          <section className={styles.panelists} aria-labelledby="career-panelists-heading">
            <div className={styles.sectionHeading}>
              <h2 id="career-panelists-heading">Meet the panelists</h2>
              <p>Select a panelist to read their story.</p>
            </div>
            <ul className={styles.panelistGrid}>
              {careerPanelists.map((panelist) => (
                <li key={panelist.id}>
                  <details className={styles.panelist}>
                    <summary>
                      {panelist.photo ? (
                        <Image src={panelist.photo} alt="" width={64} height={64} sizes="64px" className={styles.portrait} />
                      ) : <span className={styles.initials} aria-hidden="true">{panelist.initials}</span>}
                      <span className={styles.panelistInfo}>
                        <span className={styles.panelistName}>{panelist.name}</span>
                        <span className={styles.role}>{panelist.role}</span>
                        <span className={styles.bioLabel}><span className={styles.whenClosed}>Read bio</span><span className={styles.whenOpen}>Close bio</span></span>
                      </span>
                      <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
                    </summary>
                    <p className={styles.bio}>{panelist.bio}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.detailsSection} aria-labelledby="career-expect-heading">
            <div className={styles.sectionHeading}>
              <h2 id="career-expect-heading">An evening to explore</h2>
              <p>Hear career stories, ask your questions, try a hands-on activity, and meet the panelists one-on-one.</p>
            </div>
            <details className={styles.disclosure}>
              <summary><span><strong>Evening agenda</strong><span>Two panels, an activity &amp; time to connect</span></span><ChevronDown size={20} className={styles.chevron} aria-hidden="true" /></summary>
              <ol className={styles.agenda}>
                {careerPanelAgenda.map((item) => (
                  <li key={item.title}><p>{item.time}</p><div><h3>{item.title}</h3><p>{item.description}</p></div></li>
                ))}
              </ol>
            </details>
            <p className={styles.questions}>Have a question? <Link href="/contact">Contact our team <ArrowUpRight size={16} aria-hidden="true" /></Link></p>
          </section>
        </div>
      </div>
    </main>
  )
}
