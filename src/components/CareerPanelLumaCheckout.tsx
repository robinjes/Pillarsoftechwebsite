'use client'

import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import Script from 'next/script'
import type { PublicEvent } from '@/lib/content-contracts'

const CHECKOUT_EVENTS = {
  'career-panel-granada': { id: 'evt-Kt3fAmxzXjJdAH2', title: 'Career Panel', label: 'Register for FREE', note: 'Use a non-school email.' },
  'wildcat-tank-pt-2': { id: 'evt-GHROQ1bDfnCbsx0', title: 'Wildcat Tank Pt 2', label: 'Register for Event', note: 'Free for all LVJUSD elementary and middle school families. After you register, we’ll send you another form 1–2 weeks before the event to collect final details.' },
} as const
const CAREER_PANEL_LUMA_SCRIPT = 'https://embed.lu.ma/checkout-button.js'
const CHECKOUT_BUTTON_CLASSES = 'inline-flex w-full min-h-14 items-center justify-center rounded-full bg-[var(--midnight)] px-6 py-4 text-lg font-bold text-[var(--cream)] transition-colors hover:bg-[var(--cobalt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]'

type SavedAttribute = {
  element: HTMLElement
  name: string
  value: string | null
}

declare global {
  interface Window {
    luma?: {
      initCheckout?: () => void
    }
  }
}

type CareerPanelLumaCheckoutProps = {
  event: Pick<PublicEvent, 'id' | 'status' | 'registrationLink'>
  className?: string
}

function initializeLumaCheckout() {
  window.luma?.initCheckout?.()
}

function currentDocumentNonce(): string | null {
  const nonceSource = document.getElementById('organization-jsonld')
  return nonceSource instanceof HTMLScriptElement ? nonceSource.nonce || null : null
}

function rememberAndSetAttribute(saved: SavedAttribute[], element: HTMLElement, name: string, value: string) {
  saved.push({ element, name, value: element.getAttribute(name) })
  element.setAttribute(name, value)
}

function restoreAttributes(saved: SavedAttribute[]) {
  for (const { element, name, value } of saved) {
    if (!element.isConnected) continue
    if (value === null) element.removeAttribute(name)
    else element.setAttribute(name, value)
  }
}

function overlayFocusableElements(overlay: HTMLElement): HTMLElement[] {
  return Array.from(overlay.querySelectorAll<HTMLElement>(
    'button:not([disabled]), iframe, a[href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')
}

export function EventLumaCheckout({ event, className }: CareerPanelLumaCheckoutProps) {
  const noteId = useId()
  const [nonce, setNonce] = useState<string | null>(null)
  const triggerRef = useRef<HTMLAnchorElement | null>(null)
  const pendingOpenFrameRef = useRef<number | null>(null)
  const activeOverlayRef = useRef<HTMLElement | null>(null)
  const releaseOverlayRef = useRef<((restoreFocus: boolean) => void) | null>(null)
  const checkout = CHECKOUT_EVENTS[event.id as keyof typeof CHECKOUT_EVENTS]
  const checkoutUrl = checkout ? `https://luma.com/event/${checkout.id}` : ''
  const isEligible = Boolean(checkout)
    && (event.status === 'upcoming' || event.status === 'ongoing')

  useEffect(() => {
    if (!isEligible) return
    setNonce(currentDocumentNonce())
    initializeLumaCheckout()
  }, [isEligible])

  useEffect(() => {
    if (!isEligible) return

    return () => {
      if (pendingOpenFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingOpenFrameRef.current)
        pendingOpenFrameRef.current = null
      }

      const overlay = activeOverlayRef.current || (triggerRef.current
        ? document.querySelector<HTMLElement>('.luma-checkout--overlay')
        : null)
      const closeButton = overlay?.querySelector<HTMLElement>('.luma-checkout--close-btn')
      releaseOverlayRef.current?.(false)
      if (overlay?.isConnected) closeButton?.click()
    }
  }, [isEligible])

  function handleCheckoutClickCapture(event: MouseEvent<HTMLAnchorElement>) {
    const trigger = event.currentTarget
    triggerRef.current = trigger

    if (pendingOpenFrameRef.current !== null) {
      window.cancelAnimationFrame(pendingOpenFrameRef.current)
    }

    pendingOpenFrameRef.current = window.requestAnimationFrame(() => {
      pendingOpenFrameRef.current = null
      const overlay = document.querySelector<HTMLElement>('.luma-checkout--overlay')
      if (!overlay || !overlay.isConnected) {
        if (triggerRef.current === trigger) triggerRef.current = null
        return
      }

      releaseOverlayRef.current?.(false)
      activeOverlayRef.current = overlay
      const savedAttributes: SavedAttribute[] = []
      const closeButton = overlay.querySelector<HTMLElement>('.luma-checkout--close-btn')
      const checkoutFrame = overlay.querySelector<HTMLIFrameElement>('iframe')
      const poweredByLink = overlay.querySelector<HTMLAnchorElement>('.luma-checkout--by a[href]')

      rememberAndSetAttribute(savedAttributes, overlay, 'role', 'dialog')
      rememberAndSetAttribute(savedAttributes, overlay, 'aria-modal', 'true')
      rememberAndSetAttribute(savedAttributes, overlay, 'aria-label', `${checkout.title} registration`)
      if (closeButton) rememberAndSetAttribute(savedAttributes, closeButton, 'aria-label', `Close ${checkout.title} registration`)
      if (checkoutFrame) rememberAndSetAttribute(savedAttributes, checkoutFrame, 'title', `${checkout.title} registration`)
      if (poweredByLink && !poweredByLink.textContent?.trim()) {
        rememberAndSetAttribute(savedAttributes, poweredByLink, 'aria-label', 'Powered by Luma')
      }

      const onOverlayKeyDown = (keyboardEvent: KeyboardEvent) => {
        if (!overlay.isConnected) return

        if (keyboardEvent.key === 'Escape' && closeButton?.isConnected) {
          keyboardEvent.preventDefault()
          closeButton.click()
          return
        }
        if (keyboardEvent.key !== 'Tab') return

        const focusable = overlayFocusableElements(overlay)
        if (focusable.length === 0) {
          keyboardEvent.preventDefault()
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const activeElement = document.activeElement
        if (keyboardEvent.shiftKey && (activeElement === first || !overlay.contains(activeElement))) {
          keyboardEvent.preventDefault()
          last.focus()
        } else if (!keyboardEvent.shiftKey && (activeElement === last || !overlay.contains(activeElement))) {
          keyboardEvent.preventDefault()
          first.focus()
        }
      }

      const observer = new MutationObserver(() => {
        if (!overlay.isConnected) release(true)
      })
      const activeTrigger = trigger

      function release(restoreFocus: boolean) {
        observer.disconnect()
        document.removeEventListener('keydown', onOverlayKeyDown, true)
        restoreAttributes(savedAttributes)
        if (activeOverlayRef.current === overlay) activeOverlayRef.current = null
        if (releaseOverlayRef.current === release) releaseOverlayRef.current = null
        if (triggerRef.current === activeTrigger) triggerRef.current = null
        if (restoreFocus && activeTrigger.isConnected) activeTrigger.focus({ preventScroll: true })
      }

      releaseOverlayRef.current = release
      document.addEventListener('keydown', onOverlayKeyDown, true)
      observer.observe(document.body, { childList: true, subtree: true })
      closeButton?.focus({ preventScroll: true })
    })
  }

  if (!isEligible) return null

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`luma-checkout--button ${className || CHECKOUT_BUTTON_CLASSES}`}
        data-luma-action="checkout"
        data-luma-event-id={checkout.id}
        aria-describedby={noteId}
        onClickCapture={handleCheckoutClickCapture}
      >
        {checkout.label}
      </a>
      <p id={noteId} className="text-xs leading-5 text-[var(--ink)]/75">{checkout.note}</p>
      {nonce ? (
        <Script
          id="luma-checkout"
          src={CAREER_PANEL_LUMA_SCRIPT}
          strategy="afterInteractive"
          nonce={nonce}
          onReady={initializeLumaCheckout}
        />
      ) : null}
    </div>
  )
}

export default function CareerPanelLumaCheckout(props: CareerPanelLumaCheckoutProps) {
  if (props.event.id !== 'career-panel-granada') return null
  return <EventLumaCheckout {...props} />
}
