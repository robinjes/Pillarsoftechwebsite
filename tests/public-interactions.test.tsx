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

  it('keeps Support open when a keyboard activation follows focus-open', async () => {
    render(<Navbar />)
    const supportButton = screen.getByRole('button', { name: /Support/ })
    fireEvent.focus(supportButton)
    await waitFor(() => expect(document.getElementById('support-navigation')).toBeInTheDocument())

    fireEvent.click(supportButton, { detail: 0 })
    expect(document.getElementById('support-navigation')).toBeInTheDocument()
    expect(supportButton).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('ImpactSection rendered behavior', () => {
  it('renders each approved metric with its source and methodology note', () => {
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
    expect(screen.getByText('Students reached')).toBeInTheDocument()
    expect(screen.getByText('As of 2026-08-18')).toBeInTheDocument()
    expect(screen.getByText('How this is counted')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See the source' })).toHaveAttribute('href', 'https://www.pillarsoftech.org/about')
  })
})
