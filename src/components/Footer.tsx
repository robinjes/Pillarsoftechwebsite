'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { usePathname } from 'next/navigation'

import BrandMark from '@/components/site/BrandMark'

const exploreLinks = [
  { label: 'About', href: '/about' },
  { label: 'Team', href: '/team' },
  { label: 'Events', href: '/events' },
  { label: 'Volunteer', href: '/volunteer' },
  { label: 'Fundraiser', href: '/fundraiser' },
]

const resourceLinks = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'Contact', href: '/contact' },
]

const currentYear = new Date().getFullYear()

export default function Footer() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin') || pathname.startsWith('/volunteer/checkin')) return null

  return (
    <footer className="public-footer signal-footer">
      <div className="signal-shell">
        <div className="signal-footer__lead">
          <div><BrandMark /><p>Breaking barriers. Building innovators.</p></div>
          <a href="https://hcb.hackclub.com/pillars-of-tech/transactions" target="_blank" rel="noreferrer" className="signal-button signal-button--light">Transparent finances <ArrowUpRight aria-hidden="true" /></a>
        </div>
        <div className="signal-footer__grid">
          <div><h2 className="signal-mono">EXPLORE</h2><nav aria-label="Explore footer links">{exploreLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></div>
          <div><h2 className="signal-mono">RESOURCES</h2><nav aria-label="Resource footer links">{resourceLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></div>
          <div className="signal-footer__find"><h2 className="signal-mono">FIND US</h2><a href="https://www.youtube.com/@PillarsofTech" target="_blank" rel="noreferrer">YouTube <ArrowUpRight aria-hidden="true" /></a><a href="https://www.instagram.com/thepillarsoftech" target="_blank" rel="noreferrer">Instagram <ArrowUpRight aria-hidden="true" /></a><div className="signal-footer__sponsor"><Image src="/logonotext.png" alt="" width={30} height={30} /><span>Pillars of Tech is fiscally sponsored by Hack Club.</span></div></div>
        </div>
        <div className="signal-footer__bottom"><p>© {currentYear} Pillars of Tech. All rights reserved.</p><span className="signal-mono">BUILT FOR CURIOUS MINDS</span></div>
      </div>
    </footer>
  )
}
