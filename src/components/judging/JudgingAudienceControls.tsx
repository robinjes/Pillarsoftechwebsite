'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Download, ExternalLink, QrCode } from 'lucide-react'
import type { JudgingAdminEvent } from '@/lib/judging-contracts'
import { DEFAULT_AWARDS_MESSAGE } from '@/lib/judging-audience'
import { fieldClass, primaryButton, secondaryButton, sendJson } from '../feedback/admin-ui'

export default function JudgingAudienceControls({ event, demo = false, onChange }: { event: JudgingAdminEvent; demo?: boolean; onChange: () => Promise<void> }) {
  const [link, setLink] = useState('')
  const [qr, setQr] = useState('')
  const [message, setMessage] = useState(event.awardsMessage || DEFAULT_AWARDS_MESSAGE)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const url = `${window.location.origin}/judging/${demo ? 'demo/families' : 'families'}?eventId=${event.id}`
    let active = true
    setLink(url)
    void QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 1024, color: { dark: '#0D2B4A', light: '#FFFFFF' } })
      .then((data) => { if (active) setQr(data) }).catch(() => { if (active) setError('Could not generate the QR image. Share the link below instead.') })
    return () => { active = false }
  }, [event.id, demo])

  async function save(patch: { awardsMessage?: string; resultsReleased?: boolean }) {
    setBusy(true); setError(''); setNotice('')
    try {
      await sendJson(demo ? '/api/dev/judging/host/audience' : '/api/admin/judging/audience', 'POST', { eventId: event.id, ...patch })
      await onChange()
      setNotice(patch.resultsReleased === true ? 'All results are now visible to families.' : patch.resultsReleased === false ? 'Results are hidden from families.' : 'Awards information saved.')
    } catch (err) { setError(err instanceof Error ? err.message : 'The parent page could not be updated.') }
    finally { setBusy(false) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setNotice('Parent link copied.'); setError('') }
    catch { setError('Clipboard unavailable. Select and copy the link below.') }
  }

  return <section className="border border-midnight/25 bg-warm p-5" aria-label="Parent QR and results release">
    <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-midnight"><QrCode className="h-5 w-5" aria-hidden="true" /> Parent QR & results</h2>
    <p className="mt-2 text-sm text-ink/70">Families can follow presentations and see awards information. Scores stay hidden until you release everyone’s results together after the awards presentation.</p>
    <div className="mt-4 flex flex-col gap-5 sm:flex-row">
      {qr ? <div className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated QR data URL */}
        <img src={qr} alt="QR code for the parent event page" className="h-44 w-44 border border-midnight/20 bg-white" />
        <a className={`${secondaryButton} mt-2`} href={qr} download={`parent-event-${event.id}-qr.png`}><Download className="h-4 w-4" aria-hidden="true" /> Download QR</a>
      </div> : null}
      <div className="min-w-0 flex-1">
        <label className="block text-sm font-semibold text-midnight">Parent event link<input className={`${fieldClass} mt-1 font-mono text-xs`} readOnly value={link} onFocus={(e) => e.target.select()} /></label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} disabled={!link} onClick={copy}><Copy className="h-4 w-4" aria-hidden="true" /> Copy parent link</button>
          {link ? <a className={secondaryButton} href={link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Preview parent page</a> : null}
        </div>
        <p className="mt-2 text-xs text-ink/65">Share this QR with families. Keep OBS links and judge codes with staff. The parent link includes student names and projects; judge identities, codes, and comments stay private.</p>
      </div>
    </div>
    <form className="mt-5" onSubmit={(e) => { e.preventDefault(); void save({ awardsMessage: message }) }}>
      <label className="block text-sm font-semibold text-midnight">Awards time or announcement<textarea className={`${fieldClass} mt-1`} rows={2} maxLength={240} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      <button type="submit" className={`${secondaryButton} mt-2`} disabled={busy}>Save awards information</button>
    </form>
    <div className="mt-5 border-t border-midnight/20 pt-4">
      <p className="font-semibold text-midnight">{event.resultsReleased && event.scoresLocked ? 'Results are visible to families' : 'Results are hidden from families'}</p>
      <p className="mt-1 text-sm text-ink/70">Lock scores and finish the awards presentation, then release all results. Locking scores or ending the event does not release results automatically. Unlocking scores hides them again.</p>
      {event.resultsReleased ? <button type="button" className={`${secondaryButton} mt-3`} disabled={busy} onClick={() => void save({ resultsReleased: false })}>Hide results from families</button> : <button type="button" className={`${primaryButton} mt-3`} disabled={busy || !event.scoresLocked} onClick={() => {
        if (window.confirm(`Release all results for "${event.title}" to families now?\n\nEveryone with the parent QR link will be able to see student scores and final standings.`)) void save({ resultsReleased: true })
      }}>Release all results to families</button>}
      {!event.scoresLocked ? <p className="mt-2 text-xs text-ink/65">Lock scores before releasing results.</p> : null}
    </div>
    {error ? <p role="alert" className="mt-3 text-sm text-red-900">{error}</p> : null}
    {notice ? <p role="status" className="mt-3 text-sm text-midnight">{notice}</p> : null}
  </section>
}
