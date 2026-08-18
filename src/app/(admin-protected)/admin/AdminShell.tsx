'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  Calendar,
  Clock,
  FileText,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Events', href: '/admin/events', icon: Calendar },
  { name: 'Volunteers', href: '/admin/volunteers', icon: Users },
  { name: 'Hours', href: '/admin/hours', icon: Clock },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Forms', href: '/admin/forms', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

type SignOutProps = {
  onSignOut: () => void
  signingOut: boolean
  signoutError: string
  mobile?: boolean
}

function SignOutControl({ onSignOut, signingOut, signoutError, mobile = false }: SignOutProps) {
  return (
    <div className={mobile ? 'border-t border-white/20 px-5 py-5' : 'flex items-center gap-3'}>
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        aria-busy={signingOut}
        className={`inline-flex min-h-11 items-center justify-center gap-2 border border-sky/60 px-4 text-sm font-bold transition-colors hover:bg-sky hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 focus-visible:ring-offset-midnight disabled:cursor-not-allowed disabled:opacity-60 ${mobile ? 'w-full' : 'text-sky'}`}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
      {signoutError ? (
        <p role="alert" aria-live="assertive" className={`text-sm leading-5 text-sky ${mobile ? 'mt-3' : 'max-w-48'}`}>
          {signoutError}
        </p>
      ) : null}
    </div>
  )
}

type NavigationLinksProps = {
  pathname: string
  onNavigate?: () => void
  mobile?: boolean
}

function NavigationLinks({ pathname, onNavigate, mobile = false }: NavigationLinksProps) {
  return (
    <nav className={mobile ? 'flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-6' : 'hidden items-center gap-1 lg:flex'} aria-label="Admin navigation">
      {navItems.map((item) => {
        const isActive = isAdminNavItemActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center gap-2 border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 focus-visible:ring-offset-midnight ${mobile ? 'w-full border-transparent py-2' : 'border-transparent'} ${isActive ? 'border-sky/40 bg-sky text-midnight' : 'text-warm/75 hover:border-white/20 hover:bg-white/10 hover:text-warm'}`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

function AdminBrand() {
  return (
    <Link
      href="/admin"
      className="inline-flex min-h-11 items-center gap-3 text-warm transition-colors hover:text-sky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center border border-sky bg-sky text-midnight" aria-hidden="true">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-display text-lg font-semibold tracking-[-0.03em]">Admin</span>
        <span className="block text-[0.65rem] font-bold uppercase tracking-[0.16em] text-warm/60">Staff workspace</span>
      </span>
    </Link>
  )
}

type MobileDrawerProps = SignOutProps & {
  pathname: string
  dialogRef: RefObject<HTMLDivElement | null>
  closeButtonRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}

function MobileDrawer({ pathname, dialogRef, closeButtonRef, onClose, onSignOut, signingOut, signoutError }: MobileDrawerProps) {
  return (
    <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close admin navigation"
        className="absolute inset-0 h-full w-full bg-midnight/80"
        onClick={onClose}
      />
      <div
        id="admin-mobile-drawer"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-mobile-drawer-title"
        className="absolute inset-y-0 left-0 flex w-[min(24rem,92vw)] flex-col border-r border-white/20 bg-midnight text-warm"
      >
        <div className="flex items-center justify-between border-b border-white/20 px-5 py-5">
          <div id="admin-mobile-drawer-title" className="font-display text-lg font-semibold">Admin navigation</div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close admin navigation"
            className="inline-flex min-h-11 min-w-11 items-center justify-center border border-white/40 text-warm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 pt-5">
          <AdminBrand />
        </div>
        <NavigationLinks pathname={pathname} onNavigate={onClose} mobile />
        <SignOutControl onSignOut={onSignOut} signingOut={signingOut} signoutError={signoutError} mobile />
      </div>
    </div>
  )
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/admin'
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signoutError, setSignoutError] = useState('')
  const openerRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!sidebarOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false
        openerRef.current?.focus()
      }
      return
    }

    wasOpenRef.current = true
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
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

    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [sidebarOpen])

  const handleSignOut = async () => {
    if (signingOut) return

    setSigningOut(true)
    setSignoutError('')
    try {
      const response = await fetch('/auth/signout', { method: 'POST', cache: 'no-store' })
      if (!response.ok) throw new Error('signout_failed')
      router.push('/admin/login')
      router.refresh()
    } catch {
      setSignoutError('Sign out could not be completed. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <header className="sticky top-0 z-40 border-b border-white/20 bg-midnight text-warm">
        <div className="site-shell mx-auto flex min-h-[4.75rem] items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <button
              ref={openerRef}
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin navigation"
              aria-expanded={sidebarOpen}
              aria-controls="admin-mobile-drawer"
              className="inline-flex min-h-11 min-w-11 items-center justify-center border border-white/40 text-warm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <AdminBrand />
          </div>

          <NavigationLinks pathname={pathname} />
          <div className="hidden lg:block">
            <SignOutControl onSignOut={handleSignOut} signingOut={signingOut} signoutError={signoutError} />
          </div>
        </div>
      </header>

      {sidebarOpen ? (
        <MobileDrawer
          pathname={pathname}
          dialogRef={dialogRef}
          closeButtonRef={closeButtonRef}
          onClose={() => setSidebarOpen(false)}
          onSignOut={handleSignOut}
          signingOut={signingOut}
          signoutError={signoutError}
        />
      ) : null}

      <div className="site-shell mx-auto w-full flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        {children}
      </div>
    </div>
  )
}
