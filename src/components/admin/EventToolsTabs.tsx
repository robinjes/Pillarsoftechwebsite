'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircleQuestion, MessageSquareHeart } from 'lucide-react'

const tabs = [
  { href: '/admin/qna', label: 'Live Q&A', icon: MessageCircleQuestion },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
]

/** Switches between the two unlisted event tools that share one admin tab. */
export default function EventToolsTabs() {
  const pathname = usePathname() || ''
  return (
    <nav aria-label="Event tools" className="mb-6 flex border-b-2 border-midnight/15">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-0.5 inline-flex min-h-11 items-center gap-2 border-b-4 px-4 text-sm font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky ${active ? 'border-midnight text-midnight' : 'border-transparent text-ink/60 hover:text-midnight'}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </Link>
        )
      })}
    </nav>
  )
}
