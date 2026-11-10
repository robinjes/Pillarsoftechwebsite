'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

type MotionViewOptions = {
  familyKey: string
  images: string[]
  imageCount: number
  aspectId: string
  loopSec: number
  params: Record<string, number>
  customBg: string
  easePts: number[]
}

declare global {
  interface Window {
    MotionView?: {
      mount: (canvas: HTMLCanvasElement, options: MotionViewOptions) => { destroy: () => void }
    }
  }
}

export default function EventMotionPhotos({ images, title }: { images: string[]; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [nonce, setNonce] = useState<string>()

  useEffect(() => {
    const source = document.getElementById('organization-jsonld')
    setNonce(source instanceof HTMLScriptElement ? source.nonce : '')
  }, [])

  useEffect(() => {
    if (!ready || paused || !images.length || !canvasRef.current || !window.MotionView) return
    try {
      const pageBackground = getComputedStyle(canvasRef.current).getPropertyValue('--cream').trim() || '#DED5C7'
      const animation = window.MotionView.mount(canvasRef.current, {
        familyKey: 'carousel',
        images,
        imageCount: images.length,
        aspectId: '16:9',
        loopSec: 9,
        params: { count: 7, size: 0.4, gap: 0.3 },
        customBg: pageBackground,
        easePts: [0.4, 0, 0.2, 1],
      })
      return () => animation.destroy()
    } catch {
      setFailed(true)
    }
  }, [images, ready, paused])

  if (!images.length || failed) return null

  return (
    <div className="mt-7">
      {nonce !== undefined ? <Script
        src="https://feralui.dev/motionview/runtime.js"
        nonce={nonce || undefined}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      /> : null}
      <canvas ref={canvasRef} role="img" aria-label={`${title} animated photo collection. Individual photos are available below.`} className={`aspect-video w-full max-w-full ${ready ? '' : 'hidden'}`} />
      {ready ? <button type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)} className="mt-3 inline-flex min-h-11 items-center rounded-full border border-[var(--ink)] px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]">
        {paused ? 'Play photo animation' : 'Pause photo animation'}
      </button> : null}
    </div>
  )
}
