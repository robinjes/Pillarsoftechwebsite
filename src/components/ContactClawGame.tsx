'use client'

import { ClawCaptcha, type ClawCaptchaProps } from 'playcaptcha'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

export default function ContactClawGame(props: ClawCaptchaProps) {
  const container = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    if (!container.current) return
    // The game simulates a fixed 380px machine. Scale only the machine so its
    // controls and toys remain visible on phones while instructions stay readable.
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, Math.max(0.1, (entry.contentRect.width - 40) / 380))))
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={container} className="contact-claw-game" style={{ '--contact-claw-scale': scale } as CSSProperties}><ClawCaptcha {...props} /></div>
}
