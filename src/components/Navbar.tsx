'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import BrandMark from '@/components/site/BrandMark'

const primaryLinks = [
  { label: 'About', href: '/about' },
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
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const supportButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
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

  if (pathname.startsWith('/admin') || pathname.startsWith('/volunteer/checkin')) return null

  return (
    <header className="public-navbar signal-navbar">
      <div className="signal-shell signal-navbar__inner">
        <BrandMark compact tone="dark" />
        <span className="public-navbar__note signal-mono" aria-hidden="true">Student-led STEM workshops</span>

        <nav className="signal-navbar__desktop" aria-label="Primary navigation">
          {primaryLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          <div
            className="signal-navbar__support"
            onMouseEnter={() => setIsSupportOpen(true)}
            onMouseLeave={() => setIsSupportOpen(false)}
            onFocusCapture={() => setIsSupportOpen(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsSupportOpen(false)
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
              className="signal-navbar__support-button"
              aria-expanded={isSupportOpen}
              aria-controls="support-navigation"
              onClick={(event) => {
                if (event.detail === 0) setIsSupportOpen((open) => !open)
                else setIsSupportOpen(true)
              }}
            >
              Support <ChevronDown className={isSupportOpen ? 'rotate-180' : ''} aria-hidden="true" />
            </button>
            {isSupportOpen ? (
              <div id="support-navigation" className="absolute right-0 top-full min-w-48 pt-2">
                <div className="signal-navbar__menu">
                  {supportLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
                </div>
              </div>
            ) : null}
          </div>
          <Link href="/events" className="signal-navbar__cta">Find an event <ArrowUpRight aria-hidden="true" /></Link>
        </nav>

        <button ref={openButtonRef} type="button" className="signal-navbar__menu-button" onClick={() => setIsOpen(true)} aria-label="Open navigation menu" aria-expanded={isOpen} aria-controls="mobile-navigation">
          <Menu aria-hidden="true" />
        </button>
      </div>

      {isOpen ? (
        <div className="signal-mobile-nav" role="presentation">
          <button type="button" aria-label="Close navigation menu" className="signal-mobile-nav__backdrop" onClick={() => setIsOpen(false)} />
          <div id="mobile-navigation" className="signal-mobile-nav__panel" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            <div className="signal-mobile-nav__top"><BrandMark compact /><button ref={closeButtonRef} type="button" onClick={() => setIsOpen(false)} aria-label="Close navigation menu"><X aria-hidden="true" /></button></div>
            <nav aria-label="Mobile navigation links">
              {[...primaryLinks, ...supportLinks].map((link) => <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}>{link.label}</Link>)}
              <Link href="/events" onClick={() => setIsOpen(false)} className="signal-navbar__cta">Find an event <ArrowUpRight aria-hidden="true" /></Link>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  )
}
