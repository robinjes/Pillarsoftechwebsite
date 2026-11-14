import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { careerPanelists } from '@/lib/career-panel-details'
import styles from './CareerPanelPage.module.css'

export default function CareerPanelists() {
  return (
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
  )
}
