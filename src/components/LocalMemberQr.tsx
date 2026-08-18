'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type LocalMemberQrProps = {
  value: string
  size: number
  alt?: string
  className?: string
}

export function LocalMemberQr({ value, size, alt = 'Membership QR code', className }: LocalMemberQrProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setDataUrl(null)
    void QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then((url) => {
      if (active) setDataUrl(url)
    }).catch(() => {
      if (active) setDataUrl(null)
    })

    return () => {
      active = false
    }
  }, [size, value])

  if (!dataUrl) {
    return (
      <div
        role="img"
        aria-label={`${alt} loading`}
        className={`flex items-center justify-center bg-slate-100 text-xs text-slate-500 ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        Loading…
      </div>
    )
  }

  {/* eslint-disable-next-line @next/next/no-img-element -- locally generated data URL is already an optimized QR asset */}
  return <img src={dataUrl} alt={alt} width={size} height={size} className={className} />
}
