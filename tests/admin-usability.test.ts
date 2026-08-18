import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(process.cwd(), 'src')
const readSource = (relativePath: string) => readFileSync(path.join(sourceRoot, relativePath), 'utf8')

describe('secure admin usability foundation', () => {
  it('keeps Google-only login clear, accessible, and motion independent', () => {
    const login = readSource('app/admin/login/page.tsx')

    expect(login).toContain("volunteerService.signInWithGoogle('/admin')")
    expect(login).toContain('isSupabaseConfigured()')
    expect(login).toContain('role="alert"')
    expect(login).toContain('Google sign-in is not configured')
    expect(login).toContain('not listed in the staff membership table')
    expect(login).toContain('min-h-12')
    expect(login).toContain('focus-visible:ring-2')
    expect(login).not.toMatch(/framer-motion|next\/font\/google|bg-gradient|backdrop-blur|animate-/)
  })

  it('matches dashboard only at /admin and preserves every admin route', () => {
    const shell = readSource('app/(admin-protected)/admin/AdminShell.tsx')

    expect(shell).toContain('pathname === href')
    expect(shell).toContain('pathname.startsWith(`${href}/`)')
    for (const route of ['/admin', '/admin/events', '/admin/volunteers', '/admin/hours', '/admin/analytics', '/admin/forms', '/admin/settings']) {
      expect(shell).toContain(`href: '${route}'`)
    }
    expect(shell).not.toContain('pathname.startsWith(item.href)')
  })

  it('makes the mobile drawer a keyboard-contained modal with scroll locking', () => {
    const shell = readSource('app/(admin-protected)/admin/AdminShell.tsx')

    expect(shell).toContain('role="dialog"')
    expect(shell).toContain('aria-modal="true"')
    expect(shell).toContain("event.key === 'Escape'")
    expect(shell).toContain("event.key !== 'Tab'")
    expect(shell).toContain('event.shiftKey')
    expect(shell).toContain('document.body.style.overflow = \'hidden\'')
    expect(shell).toContain('closeButtonRef.current?.focus()')
    expect(shell).toContain('openerRef.current?.focus()')
    expect(shell).toContain('aria-expanded={sidebarOpen}')
    expect(shell).toContain('aria-controls="admin-mobile-drawer"')
  })

  it('surfaces safe signout failures and disables the active request', () => {
    const shell = readSource('app/(admin-protected)/admin/AdminShell.tsx')

    expect(shell).toContain("fetch('/auth/signout', { method: 'POST', cache: 'no-store' })")
    expect(shell).toContain('disabled={signingOut}')
    expect(shell).toContain('Sign out could not be completed. Please try again.')
    expect(shell).toContain('role="alert"')
  })

  it('keeps protected layout authorization and a legible fail-closed state', () => {
    const layout = readSource('app/(admin-protected)/admin/layout.tsx')

    expect(layout).toContain('requireVerifiedStaff()')
    expect(layout).toContain("redirect('/admin/login?error=unauthenticated')")
    expect(layout).toContain("redirect('/admin/login?error=not-staff')")
    expect(layout).toContain('No')
    expect(layout).toContain('administrative data or mutation was allowed')
    expect(layout).toContain('bg-cream')
    expect(layout).toContain('bg-warm')
    expect(layout).not.toContain('bg-slate-950')
  })
})
