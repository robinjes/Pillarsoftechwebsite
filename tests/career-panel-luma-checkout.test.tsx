/* eslint-disable @next/next/no-sync-scripts */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/script', () => ({
  default: ({ id, src, nonce, strategy }: { id: string; src: string; nonce?: string; strategy?: string }) => (
    <script id={id} src={src} nonce={nonce} data-next-script-strategy={strategy} />
  ),
}))

import CareerPanelLumaCheckout from '@/components/CareerPanelLumaCheckout'

const currentCareerEvent = {
  id: 'career-panel-granada',
  status: 'upcoming' as const,
  registrationLink: 'https://luma.com/event/evt-Kt3fAmxzXjJdAH2',
}

function addNonceSource() {
  const source = document.createElement('script')
  source.id = 'organization-jsonld'
  source.nonce = 'test-luma-nonce'
  document.body.append(source)
}

function createMockVendorOverlay(trigger: HTMLAnchorElement) {
  const overlay = document.createElement('div')
  overlay.className = 'luma-checkout--overlay'

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'luma-checkout--close-btn'
  closeButton.textContent = '×'

  const checkoutFrame = document.createElement('iframe')
  checkoutFrame.src = 'https://luma.com/embed/event/test/simple'

  const poweredByLink = document.createElement('a')
  poweredByLink.href = 'https://luma.com'
  poweredByLink.textContent = 'Powered by Luma'

  overlay.append(closeButton, checkoutFrame, poweredByLink)
  trigger.addEventListener('click', (event) => {
    event.preventDefault()
    document.body.append(overlay)
  })
  closeButton.addEventListener('click', () => overlay.remove())

  return { overlay, closeButton, checkoutFrame, poweredByLink }
}

let previousRequestAnimationFrame: typeof window.requestAnimationFrame
let previousCancelAnimationFrame: typeof window.cancelAnimationFrame

beforeEach(() => {
  previousRequestAnimationFrame = window.requestAnimationFrame
  previousCancelAnimationFrame = window.cancelAnimationFrame
  window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(0), 0)
  window.cancelAnimationFrame = (handle) => window.clearTimeout(handle)
})

afterEach(() => {
  cleanup()
  document.getElementById('organization-jsonld')?.remove()
  document.querySelectorAll('.luma-checkout--overlay').forEach((overlay) => overlay.remove())
  window.requestAnimationFrame = previousRequestAnimationFrame
  window.cancelAnimationFrame = previousCancelAnimationFrame
})

describe('Career Panel Luma checkout', () => {
  it('renders the exact Luma checkout anchor and loads the fixed script with the document nonce', async () => {
    addNonceSource()
    render(<CareerPanelLumaCheckout event={currentCareerEvent} className="custom-checkout-style" />)

    const checkout = screen.getByRole('link', { name: 'Register for Event' })
    expect(checkout).toHaveAttribute('href', 'https://luma.com/event/evt-Kt3fAmxzXjJdAH2')
    expect(checkout).toHaveClass('luma-checkout--button', 'custom-checkout-style')
    expect(checkout).toHaveAttribute('data-luma-action', 'checkout')
    expect(checkout).toHaveAttribute('data-luma-event-id', 'evt-Kt3fAmxzXjJdAH2')
    expect(checkout).toHaveAttribute('target', '_blank')
    expect(checkout).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('Use a non-school email.')).toHaveAttribute('id', 'career-panel-luma-note')

    await waitFor(() => expect(document.getElementById('luma-checkout')).toBeInTheDocument())
    expect(document.getElementById('luma-checkout')).toHaveAttribute('src', 'https://embed.lu.ma/checkout-button.js')
    expect(document.getElementById('luma-checkout')).toHaveAttribute('nonce', 'test-luma-nonce')
    expect(document.getElementById('luma-checkout')).toHaveAttribute('data-next-script-strategy', 'afterInteractive')
  })

  it.each(['completed', 'cancelled'] as const)('does not expose a checkout for a %s Career Panel record', (status) => {
    addNonceSource()
    render(<CareerPanelLumaCheckout event={{ ...currentCareerEvent, status }} />)

    expect(screen.queryByRole('link', { name: 'Register for Event' })).not.toBeInTheDocument()
    expect(document.getElementById('luma-checkout')).toBeNull()
  })

  it('keeps the direct Luma link usable when no CSP nonce source is available', async () => {
    render(<CareerPanelLumaCheckout event={currentCareerEvent} />)

    expect(screen.getByRole('link', { name: 'Register for Event' })).toHaveAttribute(
      'href',
      'https://luma.com/event/evt-Kt3fAmxzXjJdAH2',
    )
    await waitFor(() => expect(document.getElementById('luma-checkout')).toBeNull())
  })

  it('labels and focuses the vendor overlay, closes with Escape, and restores trigger focus', async () => {
    addNonceSource()
    render(<CareerPanelLumaCheckout event={currentCareerEvent} />)
    const checkout = screen.getByRole('link', { name: 'Register for Event' }) as HTMLAnchorElement
    const { overlay, closeButton, checkoutFrame, poweredByLink } = createMockVendorOverlay(checkout)

    checkout.focus()
    checkout.click()

    await waitFor(() => expect(overlay).toHaveAttribute('role', 'dialog'))
    expect(overlay).toHaveAttribute('aria-modal', 'true')
    expect(overlay).toHaveAttribute('aria-label', 'Career Panel registration')
    expect(closeButton).toHaveAttribute('aria-label', 'Close Career Panel registration')
    expect(checkoutFrame).toHaveAttribute('title', 'Career Panel registration')
    expect(document.activeElement).toBe(closeButton)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(poweredByLink)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(closeButton)

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.dispatchEvent(escapeEvent)
    expect(escapeEvent.defaultPrevented).toBe(true)
    await waitFor(() => expect(overlay.isConnected).toBe(false))
    expect(document.activeElement).toBe(checkout)
  })

  it('restores focus when the vendor close button is used', async () => {
    addNonceSource()
    render(<CareerPanelLumaCheckout event={currentCareerEvent} />)
    const checkout = screen.getByRole('link', { name: 'Register for Event' }) as HTMLAnchorElement
    const { overlay, closeButton } = createMockVendorOverlay(checkout)

    checkout.focus()
    checkout.click()
    await waitFor(() => expect(closeButton).toHaveAttribute('aria-label', 'Close Career Panel registration'))
    closeButton.click()

    await waitFor(() => expect(overlay.isConnected).toBe(false))
    expect(document.activeElement).toBe(checkout)
  })

  it('closes the vendor overlay and removes its listener when the component unmounts', async () => {
    addNonceSource()
    const { unmount } = render(<CareerPanelLumaCheckout event={currentCareerEvent} />)
    const checkout = screen.getByRole('link', { name: 'Register for Event' }) as HTMLAnchorElement
    const { overlay, closeButton } = createMockVendorOverlay(checkout)
    const closeSpy = vi.spyOn(closeButton, 'click')

    checkout.click()
    await waitFor(() => expect(overlay).toHaveAttribute('aria-modal', 'true'))
    unmount()

    expect(overlay.isConnected).toBe(false)
    expect(closeSpy).toHaveBeenCalledTimes(1)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })

  it('leaves the direct href unblocked when the vendor does not create an overlay', async () => {
    addNonceSource()
    render(<CareerPanelLumaCheckout event={currentCareerEvent} />)
    const checkout = screen.getByRole('link', { name: 'Register for Event' })
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })

    checkout.dispatchEvent(clickEvent)
    await new Promise((resolve) => window.setTimeout(resolve, 5))

    expect(clickEvent.defaultPrevented).toBe(false)
    expect(checkout).toHaveAttribute('href', 'https://luma.com/event/evt-Kt3fAmxzXjJdAH2')
    expect(document.querySelector('.luma-checkout--overlay')).toBeNull()
  })

  it('does not attach Career Panel checkout behavior to another event', () => {
    const event: typeof currentCareerEvent = {
      ...currentCareerEvent,
      id: 'another-event',
    }
    render(<CareerPanelLumaCheckout event={event} />)

    expect(screen.queryByRole('link', { name: 'Register for Event' })).not.toBeInTheDocument()
    expect(document.getElementById('luma-checkout')).toBeNull()
  })
})
