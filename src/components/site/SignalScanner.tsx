'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'

const scannerImage = '/images/events/pedrozzi-connect-egg-drop/drive-02.webp'

/**
 * The homepage's one interactive object: a print-like scan of real workshop
 * evidence. Pointer movement only updates CSS variables on the frame, so the
 * image layers do not re-render on every move. The keyboard control provides a
 * deterministic full-colour state for people who do not use a pointer.
 */
export default function SignalScanner() {
  const frameRef = useRef<HTMLDivElement>(null)
  const [isRevealed, setIsRevealed] = useState(false)

  const updateLens = (clientX: number, clientY: number) => {
    const frame = frameRef.current
    if (!frame) return
    const bounds = frame.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const x = Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - bounds.top) / bounds.height) * 100))
    frame.style.setProperty('--scanner-x', `${x}%`)
    frame.style.setProperty('--scanner-y', `${y}%`)
  }

  return (
    <div className="signal-scanner-wrap">
      <div
        ref={frameRef}
        className={`signal-scanner ${isRevealed ? 'signal-scanner--revealed' : ''}`}
        data-signal-scanner
        onPointerMove={(event) => updateLens(event.clientX, event.clientY)}
        onPointerDown={(event) => updateLens(event.clientX, event.clientY)}
      >
        <span className="sr-only">
          Students sit in a school auditorium while Pillars of Tech volunteers introduce a hands-on STEM workshop.
        </span>
        <Image
          src={scannerImage}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="signal-scanner__image signal-scanner__image--base"
        />
        <Image
          src={scannerImage}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 52vw"
          aria-hidden="true"
          className="signal-scanner__image signal-scanner__image--color"
        />

        <div className="signal-scanner__crosshair" aria-hidden="true" />
        <div className="signal-scanner__readout signal-mono" aria-hidden="true">
          <span>FIELD CAPTURE / 04</span>
          <span>WORKSHOP OPENING · PEDROZZI CONNECT</span>
        </div>
        <div className="signal-scanner__hint signal-mono" aria-hidden="true">
          MOVE TO INSPECT
        </div>

        <button
          type="button"
          className="signal-scanner__reveal signal-mono"
          aria-controls="signal-scanner-caption"
          aria-pressed={isRevealed}
          onClick={() => setIsRevealed((revealed) => !revealed)}
        >
          {isRevealed ? 'Return to scan' : 'Reveal full colour'}
        </button>

        <span className="signal-scanner__mark signal-scanner__mark--tl" aria-hidden="true" />
        <span className="signal-scanner__mark signal-scanner__mark--tr" aria-hidden="true" />
        <span className="signal-scanner__mark signal-scanner__mark--bl" aria-hidden="true" />
        <span className="signal-scanner__mark signal-scanner__mark--br" aria-hidden="true" />
      </div>

      <div id="signal-scanner-caption" className="signal-scanner__caption">
        <span className="signal-mono">01 / LOOK CLOSER</span>
        <p>Students gather for the workshop opening. Move across the frame or use the button to see the colour evidence underneath.</p>
      </div>
    </div>
  )
}
