'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import BrandMark from '@/components/site/BrandMark'

const primaryLinks = [
  { label: 'For families', href: '/#families' },
  { label: 'Events', href: '/events' },
  { label: 'Our work', href: '/#our-work' },
  { label: 'Volunteer', href: '/volunteer' },
  { label: 'Branches', href: '/#branches' },
  { label: 'Contact', href: '/contact' },
]

const supportLinks = [
  { label: 'Fundraiser', href: '/fundraiser' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'FAQ', href: '/faq' },
]

const allMobileLinks = [...primaryLinks, ...supportLinks]

export default function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const supportButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)
  const previousOverflowRef = useRef('')

  useEffect(() => {
    // Route changes close both menus so an open surface never follows a user
    // into a different page or leaves body scrolling disabled.
    setIsOpen(false)
    setIsSupportOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false
        openButtonRef.current?.focus()
      }
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        return
      }
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
    previousOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflowRef.current
    }
  }, [isOpen])

  if (pathname.startsWith('/admin') || pathname.startsWith('/volunteer/checkin')) {
    return null
  }

  const closeMenu = () => setIsOpen(false)

  return (
    <header className="site-header public-navbar">
      <div className="shell site-header__inner">
        <BrandMark compact />

        <nav className="site-nav" aria-label="Primary navigation">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="site-nav__link focus-ring">
              {link.label}
            </Link>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setIsSupportOpen(true)}
            onMouseLeave={() => setIsSupportOpen(false)}
            onFocusCapture={() => setIsSupportOpen(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsSupportOpen(false)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsSupportOpen(false)
                supportButtonRef.current?.focus()
              }
            }}
          >
            <button
              ref={supportButtonRef}
              type="button"
              className="site-nav__link focus-ring border-0 bg-transparent"
              aria-expanded={isSupportOpen}
              aria-controls="support-navigation"
              onClick={() => setIsSupportOpen((open) => !open)}
            >
              Support
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isSupportOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {isSupportOpen ? (
              <div id="support-navigation" className="absolute right-0 top-full min-w-48 pt-2">
                <div className="rounded-2xl border border-[var(--ink)]/20 bg-[var(--white)] p-2 text-[var(--ink)] shadow-[0_18px_44px_rgba(15,43,70,0.2)]">
                  {supportLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold hover:bg-[var(--sky)] focus-ring">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </nav>

        <button
          ref={openButtonRef}
          type="button"
          className="menu-button focus-ring"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
        >
          <span className="menu-button__label">Menu</span>
          <span className="menu-button__bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {isOpen ? (
        <div className="mobile-navigation" role="presentation">
          <button type="button" aria-label="Close navigation menu" className="absolute inset-0 h-full w-full border-0 bg-transparent" onClick={closeMenu} />
          <div id="mobile-navigation" className="mobile-navigation__dialog" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            <div className="flex items-center justify-between border-b border-white/20 pb-5">
              <BrandMark compact />
              <button ref={closeButtonRef} type="button" className="button button--glass focus-ring min-h-11 min-w-11 p-0" onClick={closeMenu} aria-label="Close navigation menu">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 py-6" aria-label="Mobile navigation links">
              {allMobileLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenu} className="flex min-h-12 items-center rounded-xl border-b border-white/15 px-2 text-lg font-semibold transition-colors hover:bg-white/10 hover:text-[var(--sun)] focus-ring">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  )
}
