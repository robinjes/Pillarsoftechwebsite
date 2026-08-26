'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const exploreLinks = [
  { label: 'For families', href: '/#families' },
  { label: 'Events', href: '/events' },
  { label: 'Our work', href: '/#our-work' },
  { label: 'About', href: '/about' },
  { label: 'Team', href: '/team' },
  { label: 'Volunteer', href: '/volunteer' },
]

const supportLinks = [
  { label: 'Fundraiser', href: '/fundraiser' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
]

const financeUrl = 'https://hcb.hackclub.com/pillars-of-tech/transactions'
const donationUrl = 'https://hcb.hackclub.com/donations/start/pillars-of-tech'
const currentYear = new Date().getFullYear()

export default function Footer() {
  const pathname = usePathname()

  if (pathname.startsWith('/admin') || pathname.startsWith('/volunteer/checkin')) {
    return null
  }

  return (
    <footer className="site-footer public-footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="focus-ring inline-flex min-h-11" aria-label="Pillars of Tech home">
              <Image src="/images/home/pillars-logo-white.png" alt="Pillars of Tech" width={260} height={46} sizes="(max-width: 640px) 220px, 260px" />
            </Link>
            <p>Helping young people build pathways to progress through technology.</p>
            <div className="mt-5 flex flex-wrap gap-4">
              <a href={financeUrl} target="_blank" rel="noreferrer" className="text-link focus-ring text-[var(--sun)]">
                Transparent finances
              </a>
              <a href={donationUrl} target="_blank" rel="noreferrer" className="text-link focus-ring text-[var(--sun)]">
                Support our work
              </a>
            </div>
          </div>

          <div>
            <h2>Explore</h2>
            <nav className="flex flex-col items-start" aria-label="Explore footer links">
              {exploreLinks.map((link) => (
                <Link key={link.href} href={link.href} className="focus-ring">{link.label}</Link>
              ))}
            </nav>
          </div>

          <div>
            <h2>Support</h2>
            <nav className="flex flex-col items-start" aria-label="Support footer links">
              {supportLinks.map((link) => (
                <Link key={link.href} href={link.href} className="focus-ring">{link.label}</Link>
              ))}
            </nav>
          </div>

          <div className="footer-connect">
            <h2>Find us</h2>
            <div className="flex flex-col items-start">
              <a className="focus-ring" href="https://www.youtube.com/@PillarsofTech" target="_blank" rel="noreferrer">YouTube <span className="sr-only">(opens in a new tab)</span></a>
              <a className="focus-ring" href="https://www.instagram.com/thepillarsoftech" target="_blank" rel="noreferrer">Instagram <span className="sr-only">(opens in a new tab)</span></a>
            </div>
            <p className="mt-5 border-t border-white/20 pt-4 text-xs leading-5 text-white/60">Pillars of Tech is fiscally sponsored through Hack Club.</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {currentYear} Pillars of Tech. All rights reserved.</p>
          <p>Family-friendly by design.</p>
        </div>
      </div>
    </footer>
  )
}
