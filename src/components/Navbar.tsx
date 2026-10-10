'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import BrandMark from '@/components/site/BrandMark'

type NavigationLink = { label: string; href: string; external?: boolean }

const familyLinks: NavigationLink[] = [
  { label: 'Family information', href: '/#families' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Newsletter', href: '/newsletter' },
]

const workLinks: NavigationLink[] = [
  { label: 'Our mission', href: '/#our-work' },
  { label: 'About', href: '/about' },
  { label: 'Team', href: '/team' },
]

const supportLinks: NavigationLink[] = [
  { label: 'Fundraiser', href: '/fundraiser' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'Donate', href: 'https://hcb.hackclub.com/donations/start/pillars-of-tech', external: true },
  { label: 'Transparent Finances', href: 'https://hcb.hackclub.com/pillars-of-tech/transactions', external: true },
]

const primaryLinks = [
  { label: 'For Families', links: familyLinks },
  { label: 'Events', href: '/events' },
  { label: 'Our Work', links: workLinks },
  { label: 'Volunteer', href: '/volunteer' },
  { label: 'Support', links: supportLinks },
  { label: 'Contact', href: '/contact' },
]

function NavigationDestination({ link, onNavigate, className }: { link: NavigationLink; onNavigate: () => void; className: string }) {
  if (link.external) {
    return <a href={link.href} target="_blank" rel="noreferrer" onClick={onNavigate} className={className}>{link.label}<span className="sr-only"> (opens in a new tab)</span></a>
  }
  return <Link href={link.href} onClick={onNavigate} className={className}>{link.label}</Link>
}

function NavigationDropdown({ label, links, open, onToggle, onClose }: {
  label: string; links: NavigationLink[]; open: boolean; onToggle: () => void; onClose: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const id = `navigation-${label.toLowerCase().replaceAll(' ', '-')}`

  return (
    <div className="site-nav__group" data-navigation-dropdown onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onClose()
    }} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        onClose()
        triggerRef.current?.focus()
      }
      if (event.key === 'ArrowDown' && event.target === triggerRef.current) {
        event.preventDefault()
        if (!open) onToggle()
        window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus())
      }
    }}>
      <button ref={triggerRef} type="button" className="site-nav__link focus-ring" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        {label}<ChevronDown aria-hidden="true" className={`h-4 w-4 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div ref={panelRef} id={id} className="site-nav__dropdown">
        {links.map((link) => <NavigationDestination key={link.href} link={link} onNavigate={onClose} className="site-nav__dropdown-link focus-ring" />)}
      </div>}
    </div>
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)
  const previousOverflowRef = useRef('')
  const headerMode = pathname === '/' ? 'site-header--home' : 'site-header--solid'

  useEffect(() => {
    // Route changes close the mobile menu so body scrolling is restored.
    setIsOpen(false)
    setOpenDropdown(null)
  }, [pathname])

  useEffect(() => {
    if (!openDropdown) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-navigation-dropdown]')) setOpenDropdown(null)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [openDropdown])

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
    <header className={`site-header public-navbar ${headerMode}`}>
      <div className="shell site-header__inner">
        <BrandMark compact />

        <nav className="site-nav" aria-label="Primary navigation">
          {primaryLinks.map((item) => item.links ? (
            <NavigationDropdown key={item.label} label={item.label} links={item.links} open={openDropdown === item.label} onToggle={() => setOpenDropdown((current) => current === item.label ? null : item.label)} onClose={() => setOpenDropdown(null)} />
          ) : <Link key={item.href} href={item.href} onClick={() => setOpenDropdown(null)} className="site-nav__link focus-ring">{item.label}</Link>)}
        </nav>

        <button
          ref={openButtonRef}
          type="button"
          className="menu-button focus-ring"
          onClick={() => { setOpenDropdown(null); setIsOpen(true) }}
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

      {isOpen && typeof document !== 'undefined' ? createPortal(
        <div className="mobile-navigation" role="presentation">
          <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 h-full w-full border-0 bg-transparent" onClick={closeMenu} />
          <div id="mobile-navigation" className="mobile-navigation__dialog" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            <div className="flex items-center justify-between border-b border-white/20 pb-5">
              <BrandMark compact />
              <button ref={closeButtonRef} type="button" className="button button--glass focus-ring min-h-11 min-w-11 p-0" onClick={closeMenu} aria-label="Close navigation menu">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex flex-col gap-5 py-6" aria-label="Mobile navigation links">
              {primaryLinks.map((item) => item.links ? (
                <div key={item.label}>
                  <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-[var(--sun)]">{item.label}</h2>
                  <div className="flex flex-col gap-1">
                    {item.links.map((link) => <NavigationDestination key={link.href} link={link} onNavigate={closeMenu} className="flex min-h-11 items-center rounded-xl px-2 text-base font-semibold hover:bg-white/10 hover:text-[var(--sun)] focus-ring" />)}
                  </div>
                </div>
              ) : <Link key={item.href} href={item.href} onClick={closeMenu} className="flex min-h-12 items-center rounded-xl border-b border-white/15 px-2 text-lg font-semibold transition-colors hover:bg-white/10 hover:text-[var(--sun)] focus-ring">{item.label}</Link>)}
            </nav>
          </div>
        </div>,
        document.body,
      ) : null}
    </header>
  )
}
