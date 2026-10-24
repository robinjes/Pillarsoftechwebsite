import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireVerifiedStaff: vi.fn(),
  getPublicBranchDocument: vi.fn(),
  listPublicEvents: vi.fn(),
}))

vi.mock('@/lib/auth/server', () => ({ requireVerifiedStaff: mocks.requireVerifiedStaff }))
vi.mock('@/lib/content-repository', () => ({
  getPublicBranchDocument: mocks.getPublicBranchDocument,
  listPublicEvents: mocks.listPublicEvents,
}))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('not-found') } }))

import GeorgiaDesignPreviewPage, { metadata } from '@/app/(admin-protected)/admin/branches/georgia-preview/page'
import GeorgiaBranchPage, { generateMetadata } from '@/app/ga/page'
import sitemap from '@/app/sitemap'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireVerifiedStaff.mockResolvedValue({ ok: true, isStaff: true, user: {} })
  mocks.getPublicBranchDocument.mockResolvedValue(null)
  mocks.listPublicEvents.mockResolvedValue([])
})

afterEach(cleanup)

describe('private Georgia launch design', () => {
  it.each(['unauthenticated', 'not_staff', 'configuration_unavailable', 'authorization_unavailable'])(
    'returns no draft content when staff verification reports %s',
    async (code) => {
      mocks.requireVerifiedStaff.mockResolvedValue({ ok: false, code })
      expect(await GeorgiaDesignPreviewPage()).toBeNull()
      expect(mocks.requireVerifiedStaff).toHaveBeenCalledOnce()
    },
  )

  it('shows a complete photo-free preview only to verified staff', async () => {
    const { container } = render(await GeorgiaDesignPreviewPage())

    expect(screen.getByRole('complementary', { name: 'Design review notice' })).toHaveTextContent('Private design draft · not published')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pillars of Tech is coming to Georgia soon.')
    expect(screen.getByRole('heading', { name: 'Where things stand' })).toBeInTheDocument()
    expect(screen.getByText(/date and location of our first event once they’re confirmed/)).toBeInTheDocument()
    expect(container.querySelector('img, video, iframe, form, input, button')).toBeNull()
    expect(mocks.getPublicBranchDocument).not.toHaveBeenCalled()
    expect(mocks.listPublicEvents).not.toHaveBeenCalled()
  })

  it('offers existing contact paths without pretending registration is open', async () => {
    render(await GeorgiaDesignPreviewPage())
    const article = screen.getByRole('article')
    const links = within(article).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/contact', '#georgia-get-involved', '/contact', '/contact', '/contact?reason=partnerships', '/contact',
    ])
    expect(screen.getByRole('link', { name: 'Get involved' })).toHaveAttribute('href', '#georgia-get-involved')
    expect(document.getElementById('georgia-get-involved')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact us — families' })).toHaveAttribute('href', '/contact')
    expect(screen.getByRole('link', { name: /Start a conversation/ })).toHaveAttribute('href', '/contact?reason=partnerships')
    expect(screen.getByRole('link', { name: 'Back to branch editor' })).toHaveAttribute('href', '/admin/branches')
    expect(article.textContent).toContain('mention Georgia')
    expect(article.textContent).not.toMatch(/register now|join the waitlist|photo coming soon|Atlanta|\b2026\b/i)
  })

  it('uses generic private metadata with indexing disabled', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
    expect(metadata.title).toBe('Private branch design preview | Pillars of Tech')
  })
})

describe('public Georgia gate alongside the private preview', () => {
  it('still rejects public content and metadata without an approved packet', async () => {
    await expect(GeorgiaBranchPage()).rejects.toThrow('not-found')
    await expect(generateMetadata()).rejects.toThrow('not-found')
    expect(mocks.getPublicBranchDocument).toHaveBeenCalledWith('ga')
    expect(mocks.listPublicEvents).not.toHaveBeenCalled()
  })

  it('includes neither the unpublished branch nor the private preview in the sitemap', async () => {
    const entries = await sitemap()
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(new URL(entry.url).pathname).not.toBe('/ga')
      expect(new URL(entry.url).pathname).not.toMatch(/^\/admin/)
    }
  })
})
