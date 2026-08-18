'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
import Link from 'next/link'

import BrandMark from '@/components/site/BrandMark'

const primaryLinks = [
  { label: 'About', href: '/about' },
  { label: 'Events', href: '/events' },
  { label: 'Volunteer', href: '/volunteer' },
]

const supportLinks = [
  { label: 'Fundraiser', href: '/fundraiser' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false
        openButtonRef.current?.focus()
      }
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
      if (event.key !== 'Tab') return

      const dialog = document.getElementById('mobile-navigation')
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    wasOpenRef.current = true
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const closeMenu = () => setIsOpen(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-midnight text-warm">
      <div className="site-shell mx-auto flex min-h-[4.75rem] items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
        <BrandMark compact />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center px-4 text-sm font-semibold transition-colors hover:text-sky"
            >
              {link.label}
            </Link>
          ))}

          <details className="group relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 px-4 text-sm font-semibold transition-colors hover:text-sky [&::-webkit-details-marker]:hidden">
              Support
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full mt-2 min-w-48 border border-midnight/20 bg-warm p-2 text-ink shadow-[4px_4px_0_#101114]">
              {supportLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-11 items-center px-3 text-sm font-semibold transition-colors hover:bg-sky"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>

          <Link
            href="/events"
            className="ml-3 inline-flex min-h-11 items-center gap-2 border border-sky bg-sky px-4 text-sm font-bold text-midnight transition-colors hover:bg-warm"
          >
            Find an event
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>

        <button
          ref={openButtonRef}
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center border border-white/40 text-warm lg:hidden"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 h-full w-full bg-midnight/80"
            onClick={closeMenu}
          />
          <div
            id="mobile-navigation"
            className="absolute right-0 top-0 flex h-full w-[min(25rem,92vw)] flex-col border-l border-white/20 bg-midnight p-6 text-warm"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between border-b border-white/20 pb-5">
              <BrandMark compact />
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center border border-white/40"
                onClick={closeMenu}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 py-6" aria-label="Mobile navigation links">
              {[...primaryLinks, ...supportLinks].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="flex min-h-12 items-center border-b border-white/15 text-lg font-semibold transition-colors hover:text-sky"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/events"
                onClick={closeMenu}
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 border border-sky bg-sky px-4 font-bold text-midnight"
              >
                Find an event
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  )
}
