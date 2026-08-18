'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'

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

  if (pathname.startsWith('/admin') || pathname.startsWith('/volunteer/checkin')) {
    return null
  }

  return (
    <footer className="border-t border-white/20 bg-midnight text-warm">
      <div className="site-shell mx-auto px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
        <div className="editorial-grid gap-y-12">
          <div className="col-span-12 lg:col-span-5">
            <BrandMark />
            <p className="mt-6 max-w-sm text-lg leading-7 text-warm/80">
              Breaking barriers, building innovators through hands-on STEM learning.
            </p>
            <a
              href="https://hcb.hackclub.com/pillars-of-tech/transactions"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex min-h-11 items-center gap-2 border border-sky px-4 text-sm font-semibold text-sky transition-colors hover:bg-sky hover:text-midnight"
            >
              Transparent finances
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <div className="col-span-6 lg:col-span-2">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-sky">Explore</h2>
            <nav className="mt-5 flex flex-col items-start gap-3" aria-label="Explore footer links">
              {exploreLinks.map((link) => (
                <Link key={link.href} href={link.href} className="min-h-11 py-2 text-sm font-semibold text-warm/80 transition-colors hover:text-sky">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="col-span-6 lg:col-span-2">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-sky">Resources</h2>
            <nav className="mt-5 flex flex-col items-start gap-3" aria-label="Resource footer links">
              {resourceLinks.map((link) => (
                <Link key={link.href} href={link.href} className="min-h-11 py-2 text-sm font-semibold text-warm/80 transition-colors hover:text-sky">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="col-span-12 border-t border-white/20 pt-8 lg:col-span-3 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-sky">Find us</h2>
            <div className="mt-5 flex flex-col items-start gap-3">
              <a className="min-h-11 py-2 text-sm font-semibold text-warm/80 transition-colors hover:text-sky" href="https://www.youtube.com/@PillarsofTech" target="_blank" rel="noreferrer">
                YouTube <span className="sr-only">(opens in a new tab)</span>
              </a>
              <a className="min-h-11 py-2 text-sm font-semibold text-warm/80 transition-colors hover:text-sky" href="https://www.instagram.com/thepillarsoftech" target="_blank" rel="noreferrer">
                Instagram <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
            <div className="mt-6 flex items-center gap-3 border-t border-white/20 pt-5">
              <Image src="/logonotext.png" alt="" width={34} height={34} />
              <p className="text-xs leading-5 text-warm/60">Pillars of Tech is fiscally sponsored by Hack Club.</p>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/20 pt-6 text-xs text-warm/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Pillars of Tech. All rights reserved.</p>
          <p>Built for curious minds and generous communities.</p>
        </div>
      </div>
    </footer>
  )
}
