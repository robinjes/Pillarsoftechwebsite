'use client'

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'

/** Keep the card as accessible HTML while its decorative foil follows the pointer. */
export default function HolographicEventCard({ id, children, kind = 'event' }: { id: string; children: ReactNode; kind?: 'event' | 'team' }) {
  const cardRef = useRef<HTMLElement>(null)
  const motionAllowed = useRef(false)
  const frame = useRef<number | null>(null)
  const bounds = useRef<DOMRect | null>(null)
  const pointer = useRef({ x: 0.5, y: 0.5 })

  const reset = () => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    frame.current = null
    bounds.current = null
    const card = cardRef.current
    if (!card) return
    for (const property of ['--holo-x', '--holo-y', '--holo-rx', '--holo-ry', '--holo-angle']) card.style.removeProperty(property)
    card.removeAttribute('data-hologram-active')
  }

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const preference = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    const update = () => {
      motionAllowed.current = preference.matches
      if (!preference.matches) reset()
    }
    update()
    preference.addEventListener('change', update)
    return () => {
      preference.removeEventListener('change', update)
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    }
  }, [])

  const move = (event: PointerEvent<HTMLElement>) => {
    if (!motionAllowed.current || event.pointerType === 'touch') return
    const rect = bounds.current ?? event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    bounds.current = rect
    pointer.current = {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    }
    if (frame.current !== null) return
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null
      const card = cardRef.current
      if (!card) return
      const { x, y } = pointer.current
      card.style.setProperty('--holo-x', `${(x * 100).toFixed(2)}%`)
      card.style.setProperty('--holo-y', `${(y * 100).toFixed(2)}%`)
      card.style.setProperty('--holo-rx', `${((0.5 - y) * 7).toFixed(2)}deg`)
      card.style.setProperty('--holo-ry', `${((x - 0.5) * 7).toFixed(2)}deg`)
      card.style.setProperty('--holo-angle', `${(115 + (x - y) * 35).toFixed(2)}deg`)
      card.setAttribute('data-hologram-active', 'true')
    })
  }

  return (
    <article ref={cardRef} data-event-card={kind === 'event' ? id : undefined} data-team-card={kind === 'team' ? id : undefined} className="holographic-event-card flex h-full flex-col overflow-hidden rounded-[2rem] border-2 border-[var(--ink)]/35 bg-[var(--paper)]" onPointerEnter={move} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
      {children}
      <span aria-hidden="true" className="holographic-event-card__foil" />
      <span aria-hidden="true" className="holographic-event-card__glare" />
    </article>
  )
}
