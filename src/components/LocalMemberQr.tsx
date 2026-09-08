'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type LocalMemberQrProps = {
  value: string
  size: number
  alt?: string
  className?: string
}

type QrState = 'loading' | 'ready' | 'error'

export function LocalMemberQr({ value, size, alt = 'Membership QR code', className }: LocalMemberQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [state, setState] = useState<QrState>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setDataUrl(null)
    setState('loading')

    void QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size,
      color: { dark: '#0B1F3A', light: '#FFFDF8' },
    })
      .then((url) => {
        if (!active) return
        setDataUrl(url)
        setState('ready')
      })
      .catch(() => {
        if (active) setState('error')
      })

    return () => {
      active = false
    }
  }, [attempt, size, value])

  if (state === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`flex items-center justify-center bg-[var(--paper)] font-body text-xs text-[var(--ink)]/60 ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        Generating code…
      </div>
    )
  }

  if (state === 'error' || !dataUrl) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`flex flex-col items-center justify-center gap-3 border border-red-300 bg-red-50 p-3 text-center font-body text-xs text-red-950 ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        <span>QR code unavailable.</span>
        <button
          type="button"
          onClick={() => setAttempt((current) => current + 1)}
          className="inline-flex min-h-11 items-center justify-center border-2 border-red-900 px-3 py-2 font-bold text-red-950 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-red-50"
        >
          Try again
        </button>
      </div>
    )
  }

  {/* eslint-disable-next-line @next/next/no-img-element -- locally generated data URL is already an optimized QR asset */}
  return <img src={dataUrl} alt={alt} width={size} height={size} className={className} />
}
