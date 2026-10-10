import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HolographicEventCard from '@/components/HolographicEventCard'
import Link from 'next/link'

class TestPointerEvent extends MouseEvent {
  pointerType: string
  constructor(type: string, init: MouseEventInit & { pointerType?: string } = {}) {
    super(type, init)
    this.pointerType = init.pointerType ?? 'mouse'
  }
}

const listeners = new Set<() => void>()
const preference = {
  matches: true,
  addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
  removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
}

beforeEach(() => {
  preference.matches = true
  listeners.clear()
  vi.stubGlobal('matchMedia', vi.fn(() => preference))
  vi.stubGlobal('PointerEvent', TestPointerEvent)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function renderCard() {
  render(<HolographicEventCard id="workshop"><h3>Workshop</h3><Link href="/events/workshop">Event details</Link></HolographicEventCard>)
  const card = screen.getByRole('article')
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 600 } as DOMRect)
  return card
}

describe('holographic event cards', () => {
  it('tracks mouse position while retaining semantic content and working links', async () => {
    const card = renderCard()
    fireEvent.pointerMove(card, { clientX: 300, clientY: 150, pointerType: 'mouse' })
    await waitFor(() => expect(card).toHaveAttribute('data-hologram-active', 'true'))
    expect(card.style.getPropertyValue('--holo-x')).toBe('75.00%')
    expect(card.style.getPropertyValue('--holo-y')).toBe('25.00%')
    expect(card.style.getPropertyValue('--holo-rx')).toBe('1.75deg')
    expect(screen.getByRole('link', { name: 'Event details' })).toHaveAttribute('href', '/events/workshop')
    expect(card.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)
    fireEvent.pointerLeave(card)
    expect(card).not.toHaveAttribute('data-hologram-active')
    expect(card.style.getPropertyValue('--holo-x')).toBe('')
  })

  it('keeps touch scrolling and reduced-motion cards static', async () => {
    const card = renderCard()
    fireEvent.pointerMove(card, { clientX: 300, clientY: 150, pointerType: 'touch' })
    expect(card).not.toHaveAttribute('data-hologram-active')
    preference.matches = false
    listeners.forEach((listener) => listener())
    fireEvent.pointerMove(card, { clientX: 300, clientY: 150, pointerType: 'mouse' })
    await new Promise((resolve) => window.setTimeout(resolve, 10))
    expect(card).not.toHaveAttribute('data-hologram-active')
  })

  it('resets an active effect immediately when motion preferences change', async () => {
    const card = renderCard()
    fireEvent.pointerMove(card, { clientX: 300, clientY: 150 })
    await waitFor(() => expect(card).toHaveAttribute('data-hologram-active', 'true'))
    preference.matches = false
    listeners.forEach((listener) => listener())
    expect(card).not.toHaveAttribute('data-hologram-active')
    expect(card.style.getPropertyValue('--holo-ry')).toBe('')
  })

  it('cancels pending movement when the pointer exits before the next frame', async () => {
    const card = renderCard()
    fireEvent.pointerMove(card, { clientX: 300, clientY: 150 })
    fireEvent.pointerLeave(card)
    await new Promise((resolve) => window.setTimeout(resolve, 10))
    expect(card).not.toHaveAttribute('data-hologram-active')
  })
})
