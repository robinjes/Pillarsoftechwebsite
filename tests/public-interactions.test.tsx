/* eslint-disable @next/next/no-img-element */
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react'

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigationState = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ fill, priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => (
    <img
      {...props}
      alt={props.alt ?? ''}
      data-next-fill={fill ? 'true' : undefined}
      data-next-priority={priority ? 'true' : undefined}
    />
  ),
}))

import Navbar from '@/components/Navbar'
import ImpactSection from '@/components/site/ImpactSection'
import TimelapseHero from '@/components/site/TimelapseHero'

const originalMatchMedia = window.matchMedia

function setMotionPreference(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
}

describe('TimelapseHero rendered behavior', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause')
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load')

  beforeEach(() => {
    setMotionPreference(false)
    setDocumentHidden(false)
    play.mockResolvedValue(undefined)
    pause.mockImplementation(() => undefined)
    load.mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia })
    setDocumentHidden(false)
  })

  it('keeps the poster when muted autoplay is rejected', async () => {
    play.mockRejectedValueOnce(new Error('autoplay blocked'))
    const { container } = render(<TimelapseHero />)

    await waitFor(() => expect(container.querySelector('.hero-media')).toHaveClass('hero-media--poster-only'))
    expect(container.querySelector('.hero-media__poster')).toHaveAttribute('src', expect.stringContaining('wildcat-tank-poster'))
  })

  it('does not start playback when reduced motion is requested', async () => {
    setMotionPreference(true)
    const { container } = render(<TimelapseHero />)

    await waitFor(() => expect(container.querySelector('.hero-media')).toHaveClass('hero-media--poster-only'))
    expect(play).not.toHaveBeenCalled()
  })

  it('pauses a playing film when the document becomes hidden', async () => {
    render(<TimelapseHero />)
    await waitFor(() => expect(play).toHaveBeenCalled())

    setDocumentHidden(true)
    fireEvent(document, new Event('visibilitychange'))

    expect(pause).toHaveBeenCalled()
  })

  it('advances to the Carnival film when the Tank film ends', async () => {
    const { container } = render(<TimelapseHero />)
    await waitFor(() => expect(play).toHaveBeenCalled())

    const videos = container.querySelectorAll<HTMLVideoElement>('[data-hero-video]')
    expect(videos[0]).toHaveClass('is-active')
    fireEvent.ended(videos[0])

    await waitFor(() => expect(videos[1]).toHaveClass('is-active'))
    expect(load).toHaveBeenCalled()
  })
})

describe('Navbar rendered behavior', () => {
  beforeEach(() => {
    navigationState.pathname = '/'
    document.body.style.overflow = ''
  })

  afterEach(() => {
    cleanup()
    document.body.style.overflow = ''
  })

  it('uses the overlay header only on the homepage and a solid sticky mode elsewhere', () => {
    const { rerender } = render(<Navbar />)
    expect(screen.getByRole('banner')).toHaveClass('site-header--home')

    navigationState.pathname = '/events'
    rerender(<Navbar />)
    expect(screen.getByRole('banner')).toHaveClass('site-header--solid')
  })

  it('traps mobile focus, closes on Escape, restores scrolling, and returns focus', async () => {
    const { getByRole, queryByRole } = render(<Navbar />)
    const openButton = getByRole('button', { name: 'Open navigation menu' })
    document.body.style.overflow = 'scroll'
    fireEvent.click(openButton)

    const dialog = await waitFor(() => getByRole('dialog', { name: 'Mobile navigation' }))
    expect(document.body.style.overflow).toBe('hidden')
    expect(within(dialog).getByRole('button', { name: 'Close navigation menu' })).toHaveFocus()
    expect(screen.getAllByRole('button', { name: 'Close navigation menu' })).toHaveLength(1)
    const focusable = within(dialog).getAllByRole('link')
    const firstLink = focusable[0]
    const lastLink = focusable[focusable.length - 1]

    lastLink.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(firstLink).toHaveFocus()

    firstLink.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(lastLink).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(queryByRole('dialog', { name: 'Mobile navigation' })).not.toBeInTheDocument())
    expect(document.body.style.overflow).toBe('scroll')
    expect(openButton).toHaveFocus()
  })

  it('renders the mobile overlay in the body and closes it after navigation', async () => {
    const { getByRole, queryByRole, rerender } = render(<Navbar />)
    const openButton = getByRole('button', { name: 'Open navigation menu' })

    fireEvent.click(openButton)
    const dialog = await waitFor(() => getByRole('dialog', { name: 'Mobile navigation' }))

    expect(openButton).toHaveAttribute('aria-expanded', 'true')
    expect(document.body).toContainElement(dialog)
    expect(dialog.closest('header')).toBeNull()
    expect(dialog.closest('.mobile-navigation')?.parentElement).toBe(document.body)

    const eventsLink = within(dialog).getByRole('link', { name: 'Events' })
    eventsLink.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(eventsLink)
    await waitFor(() => expect(queryByRole('dialog', { name: 'Mobile navigation' })).not.toBeInTheDocument())
    expect(openButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(openButton)
    await waitFor(() => expect(getByRole('dialog', { name: 'Mobile navigation' })).toBeInTheDocument())
    navigationState.pathname = '/events'
    rerender(<Navbar />)
    await waitFor(() => expect(queryByRole('dialog', { name: 'Mobile navigation' })).not.toBeInTheDocument())
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps the desktop header compact and reveals grouped links on demand', () => {
    render(<Navbar />)
    const primaryNavigation = screen.getByRole('navigation', { name: 'Primary navigation' })

    expect(within(primaryNavigation).getAllByRole('link')).toHaveLength(3)
    expect(within(primaryNavigation).getAllByRole('button')).toHaveLength(3)
    expect(within(primaryNavigation).queryByText('Branches')).not.toBeInTheDocument()
    const support = within(primaryNavigation).getByRole('button', { name: 'Support' })
    expect(support).toHaveAttribute('aria-expanded', 'false')
    expect(within(primaryNavigation).queryByText('Wishlist')).not.toBeInTheDocument()
    fireEvent.click(support)
    expect(support).toHaveAttribute('aria-expanded', 'true')
    expect(within(primaryNavigation).getByRole('link', { name: 'Wishlist' })).toHaveAttribute('href', '/wishlist')
    expect(within(primaryNavigation).getByRole('link', { name: /Donate/ })).toHaveAttribute('target', '_blank')
    fireEvent.click(within(primaryNavigation).getByRole('button', { name: 'Our Work' }))
    expect(support).toHaveAttribute('aria-expanded', 'false')
    expect(within(primaryNavigation).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
    expect(within(primaryNavigation).queryByText('Wishlist')).not.toBeInTheDocument()
  })

  it('supports keyboard dropdown access, Escape focus restoration, and closing outside', async () => {
    render(<Navbar />)
    const families = screen.getByRole('button', { name: 'For Families' })
    families.focus()
    fireEvent.keyDown(families, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('link', { name: 'Family information' })).toHaveFocus())
    fireEvent.keyDown(screen.getByRole('link', { name: 'FAQ' }), { key: 'Escape' })
    expect(families).toHaveFocus()
    expect(families).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(families)
    fireEvent.pointerDown(document.body)
    expect(families).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(families)
    families.focus()
    screen.getByRole('link', { name: 'Events' }).focus()
    await waitFor(() => expect(families).toHaveAttribute('aria-expanded', 'false'))
  })

  it('closes dropdowns after same-page links and pathname changes', () => {
    const { rerender } = render(<Navbar />)
    const work = screen.getByRole('button', { name: 'Our Work' })
    fireEvent.click(work)
    const mission = screen.getByRole('link', { name: 'Our mission' })
    mission.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(mission)
    expect(work).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(work)
    navigationState.pathname = '/team'
    rerender(<Navbar />)
    expect(work).toHaveAttribute('aria-expanded', 'false')
  })

  it('includes all secondary pages in visible mobile groups and closes after selection', async () => {
    render(<Navbar />)
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    const dialog = screen.getByRole('dialog', { name: 'Mobile navigation' })
    for (const label of ['For Families', 'Our Work', 'Support']) expect(within(dialog).getByRole('heading', { name: label })).toBeInTheDocument()
    for (const label of ['FAQ', 'Newsletter', 'About', 'Team', 'Fundraiser', 'Wishlist', 'Donate', 'Transparent Finances']) expect(within(dialog).getByRole('link', { name: new RegExp(label) })).toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: 'Privacy' })).not.toBeInTheDocument()
    const wishlist = within(dialog).getByRole('link', { name: 'Wishlist' })
    wishlist.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(wishlist)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('ImpactSection rendered behavior', () => {
  it('renders each approved metric without an expandable methodology panel', () => {
    render(
      <ImpactSection
        metrics={[{
          key: 'students_reached',
          value: 1000,
          unit: '+',
          publicLabel: 'Students reached',
          asOf: '2026-08-18',
          sourceUrl: 'https://www.pillarsoftech.org/about',
          methodologyNote: 'Count is based on the published program record.',
          displayOrder: 1,
        }]}
      />,
    )

    expect(screen.getByText('1,000+')).toBeInTheDocument()
    expect(screen.getAllByText('Students reached')).toHaveLength(1)
    expect(screen.getByText('As of 2026-08-18')).toBeInTheDocument()
    expect(screen.queryByText('How We Count Impact')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View Source' })).not.toBeInTheDocument()
  })
})
