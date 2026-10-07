import type { ReactNode } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authState = vi.hoisted(() => ({
  requireVerifiedStaff: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`)
  }),
}))

vi.mock('@/lib/auth/server', () => ({
  requireVerifiedStaff: authState.requireVerifiedStaff,
}))

vi.mock('next/navigation', () => ({
  redirect: authState.redirect,
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}))

import ProtectedAdminLayout from '@/app/(admin-protected)/admin/layout'

const protectedContent = <div data-testid="protected-content">Dashboard content</div>

async function renderLayout(authResult: unknown) {
  authState.requireVerifiedStaff.mockResolvedValue(authResult)
  const tree = await ProtectedAdminLayout({ children: protectedContent })
  return render(tree)
}

describe('protected admin layout rendered authorization states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('explains that staff access needs owner repair when membership verification is unavailable', async () => {
    await renderLayout({ ok: false, code: 'authorization_unavailable', status: 503, message: 'unavailable' })

    expect(screen.getByRole('heading', { name: 'Staff access could not be checked' })).toBeInTheDocument()
    expect(screen.getByText(/Your Google sign-in may have succeeded/)).toBeInTheDocument()
    expect(screen.getByText(/A site owner needs to finish or repair the workspace access setup/)).toBeInTheDocument()
    expect(screen.getByText('Staff tools stay closed until access can be confirmed.')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('distinguishes missing Supabase configuration from an unavailable membership lookup', async () => {
    await renderLayout({ ok: false, code: 'configuration_unavailable', status: 503, message: 'unconfigured' })

    expect(screen.getByRole('heading', { name: 'Staff sign-in is not set up yet' })).toBeInTheDocument()
    expect(screen.getByText(/finish the sign-in setup/)).toBeInTheDocument()
    expect(screen.queryByText(/Google sign-in may have succeeded/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it.each([
    ['unauthenticated', '/admin/login?error=unauthenticated'],
    ['not_staff', '/admin/login?error=not-staff'],
  ] as const)('redirects a %s result to its existing login state', async (code, destination) => {
    authState.requireVerifiedStaff.mockResolvedValue({ ok: false, code, status: code === 'unauthenticated' ? 401 : 403, message: 'denied' })

    await expect(ProtectedAdminLayout({ children: protectedContent })).rejects.toThrow(`redirect:${destination}`)
    expect(authState.redirect).toHaveBeenCalledWith(destination)
  })

  it('renders protected staff children only after verified membership', async () => {
    const { container } = await renderLayout({
      ok: true,
      isStaff: true,
      user: {},
    })

    expect(screen.getByTestId('protected-content')).toHaveTextContent('Dashboard content')
    expect(screen.getByRole('navigation', { name: 'Admin navigation' })).toBeInTheDocument()
    expect(container.querySelector('main')).toBeNull()
  })
})
