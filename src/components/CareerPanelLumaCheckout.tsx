'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import Script from 'next/script'
import type { PublicEvent } from '@/lib/content-contracts'

const CAREER_PANEL_EVENT_ID = 'career-panel-granada'
const CAREER_PANEL_LUMA_URL = 'https://luma.com/event/evt-Kt3fAmxzXjJdAH2'
const CAREER_PANEL_LUMA_EVENT_ID = 'evt-Kt3fAmxzXjJdAH2'
const CAREER_PANEL_LUMA_SCRIPT = 'https://embed.lu.ma/checkout-button.js'
const CHECKOUT_BUTTON_CLASSES = 'inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]'

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

export default function CareerPanelLumaCheckout({ event, className }: CareerPanelLumaCheckoutProps) {
  const [nonce, setNonce] = useState<string | null>(null)
  const triggerRef = useRef<HTMLAnchorElement | null>(null)
  const pendingOpenFrameRef = useRef<number | null>(null)
  const activeOverlayRef = useRef<HTMLElement | null>(null)
  const releaseOverlayRef = useRef<((restoreFocus: boolean) => void) | null>(null)
  const isEligible = event.id === CAREER_PANEL_EVENT_ID
    && (event.status === 'upcoming' || event.status === 'ongoing')
    && event.registrationLink === CAREER_PANEL_LUMA_URL

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
      rememberAndSetAttribute(savedAttributes, overlay, 'aria-label', 'Career Panel registration')
      if (closeButton) rememberAndSetAttribute(savedAttributes, closeButton, 'aria-label', 'Close Career Panel registration')
      if (checkoutFrame) rememberAndSetAttribute(savedAttributes, checkoutFrame, 'title', 'Career Panel registration')
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
    <div className="flex flex-col items-start gap-2">
      <a
        href={CAREER_PANEL_LUMA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`luma-checkout--button ${className || CHECKOUT_BUTTON_CLASSES}`}
        data-luma-action="checkout"
        data-luma-event-id={CAREER_PANEL_LUMA_EVENT_ID}
        aria-describedby="career-panel-luma-note"
        onClickCapture={handleCheckoutClickCapture}
      >
        Register for Event
      </a>
      <p id="career-panel-luma-note" className="text-xs leading-5 text-[var(--ink)]/75">Use a non-school email.</p>
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
