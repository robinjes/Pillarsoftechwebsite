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
              <div><MapPin size={20} aria-hidden="true" /><dt className="sr-only">Location</dt><dd>{publicEventLocation(event)}<span className={styles.city}>Livermore, CA</span><a href="https://maps.app.goo.gl/byCurvSNVtUYMVLw5" target="_blank" rel="noopener noreferrer" className={styles.directions}>Get directions <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens Google Maps in a new tab)</span></a></dd></div>
            </dl>
            <a href="#career-agenda" className={styles.agendaButton}>View agenda <ChevronDown size={18} aria-hidden="true" /></a>
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

          <section className={styles.detailsSection} id="career-agenda" aria-labelledby="career-expect-heading" tabIndex={-1}>
            <div className={styles.sectionHeading}>
              <h2 id="career-expect-heading">Evening agenda</h2>
              <p>5:30–8:30 PM · Two panels, open Q&amp;A &amp; informal connections</p>
            </div>
            <ol className={styles.agenda}>
              {careerPanelAgenda.map((item) => (
                <li key={item.title}><p>{item.time}</p><div><h3>{item.title}</h3>{item.panelists ? <p><strong>Panelists:</strong> {item.panelists}</p> : null}<p>{item.description}</p></div></li>
              ))}
            </ol>
          </section>

          <section className={styles.detailsSection} aria-labelledby="career-faq-heading">
            <div className={styles.sectionHeading}>
              <h2 id="career-faq-heading">Frequently asked questions</h2>
            </div>
            <dl className={styles.faq}>
              <div>
                <dt>What should I bring?</dt>
                <dd>Bring your phone to show your ticket. A notebook is optional if you want to take notes, and you can bring anything else you would like to have with you.</dd>
              </div>
              <div>
                <dt>Where is the event?</dt>
                <dd>The event is at the Granada High School Student Union in Livermore. Use the Get directions link at the top of this page to open the exact Student Union pin in Google Maps.</dd>
              </div>
              <div>
                <dt>Will food and drinks be provided?</dt>
                <dd>Yes, food and drinks will be provided.</dd>
              </div>
            </dl>
            <p className={styles.questions}>Have a question? <Link href="/contact">Contact our team <ArrowUpRight size={16} aria-hidden="true" /></Link></p>
          </section>
        </div>
      </div>
    </main>
  )
}
