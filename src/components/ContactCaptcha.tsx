'use client'

import dynamic from 'next/dynamic'
import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import 'playcaptcha/clawcaptcha.css'

const ClawCaptcha = dynamic(() => import('./ContactClawGame'), {
  ssr: false,
  loading: () => <p role="status">Loading the claw game…</p>,
})

type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string
    action: string
    appearance: 'always' | 'interaction-only'
    size: 'flexible' | 'compact'
    callback: (token: string) => void
    'expired-callback': () => void
    'error-callback': () => void
    'timeout-callback': () => void
  }) => string
  remove: (id: string) => void
}

declare global {
  interface Window { turnstile?: Turnstile }
}

export default function ContactCaptcha({ nonce, onToken, onGameVerified, disabled }: {
  nonce?: string
  onToken: (token: string) => void
  onGameVerified: (verified: boolean) => void
  disabled: boolean
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const [scriptNonce, setScriptNonce] = useState<string | undefined>()
  const [canLoadScript, setCanLoadScript] = useState(false)
  useEffect(() => {
    // Client navigation keeps the original document CSP, not the nonce from a
    // later server component response. Use the nonce of the current document.
    setScriptNonce((document.getElementById('organization-jsonld') as HTMLScriptElement | null)?.nonce || nonce)
    setCanLoadScript(true)
  }, [nonce])

  const [mode, setMode] = useState<'regular' | 'fun'>('regular')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [gameSolved, setGameSolved] = useState(false)
  const [tokenReady, setTokenReady] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const [widgetSize, setWidgetSize] = useState<'flexible' | 'compact'>('compact')

  useEffect(() => {
    if (!container.current || !siteKey) return
    const observer = new ResizeObserver(([entry]) => setWidgetSize(entry.contentRect.width < 300 ? 'compact' : 'flexible'))
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [siteKey])

  useEffect(() => {
    if (!ready || !siteKey || !container.current || !window.turnstile) return
    let active = true
    const clearToken = () => { if (active) { onToken(''); setTokenReady(false) } }
    onToken('')
    setTokenReady(false)
    let widget: string
    try {
      widget = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action: 'contact',
        appearance: mode === 'regular' ? 'always' : 'interaction-only',
        size: widgetSize,
        callback: (token) => { if (active) { onToken(token); setTokenReady(true); setError('') } },
        'expired-callback': () => { if (active) { clearToken(); setError('Verification expired. Please verify again.') } },
        'error-callback': () => { if (active) { clearToken(); setError('Verification could not load. Try again or email us directly.') } },
        'timeout-callback': () => { if (active) { clearToken(); setError('Verification timed out. Please try again.') } },
      })
    } catch {
      setError('Verification could not load. Try again or email us directly.')
      return
    }
    return () => { active = false; window.turnstile?.remove(widget) }
  }, [ready, siteKey, mode, retry, onToken, widgetSize])

  function changeMode(nextMode: 'regular' | 'fun') {
    if (nextMode === mode) return
    onToken('')
    setTokenReady(false)
    setGameSolved(false)
    onGameVerified(nextMode === 'regular')
    setError('')
    setMode(nextMode)
  }

  return (
    <fieldset disabled={disabled} className="min-w-0 rounded-xl border border-[var(--ink)]/20 p-4 font-body text-sm">
      <legend className="px-2 font-bold text-[var(--midnight)]">One quick check</legend>
      <p className="mb-3 leading-6 text-[var(--ink)]/70">Choose a regular check or try the claw game.</p>
      <div className="mb-4 flex flex-wrap gap-3">
        {(['regular', 'fun'] as const).map((value) => (
          <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--midnight)]/30 px-4 py-2">
            <input type="radio" name="captcha-mode" value={value} checked={mode === value} onChange={() => changeMode(value)} className="accent-[var(--midnight)]" />
            {value === 'regular' ? 'Regular CAPTCHA' : 'Fun claw game'}
          </label>
        ))}
      </div>
      {siteKey ? (
        <>
          {canLoadScript && <Script id="contact-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" nonce={scriptNonce} strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setError('Verification could not load. Try reloading or email us directly.')} />}
          {mode === 'fun' && <ClawCaptcha assetBase="/captcha/playcaptcha/toys/" onVerify={() => { setGameSolved(true); onGameVerified(true) }} />}
          <div ref={container} className="mt-3 min-w-0" />
          <p role="status" className="mt-3 leading-6 text-[var(--ink)]/70">
            {tokenReady && (mode === 'regular' || gameSolved) ? 'Verified. Your message is ready to send.' : mode === 'fun' && !gameSolved ? 'Catch the requested toy to finish. You can use the arrow keys and space bar, or switch to the regular check.' : 'Complete the verification before sending.'}
          </p>
          {error && <div role="alert" className="mt-2 text-red-700"><p>{error}</p><button type="button" onClick={() => { if (!ready) { window.location.reload(); return } onToken(''); setTokenReady(false); setError(''); setRetry((value) => value + 1) }} className="mt-2 min-h-11 underline underline-offset-4">Retry verification</button></div>}
          <p className="mt-3 text-xs leading-5 text-[var(--ink)]/60">Both options use Cloudflare Turnstile to prevent spam. <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Cloudflare privacy policy</a>.</p>
        </>
      ) : <p role="status" className="leading-6">The form’s verification is temporarily unavailable. Please <a href="mailto:pillarsoftech@gmail.com" className="font-bold underline">email us directly</a>.</p>}
    </fieldset>
  )
}
