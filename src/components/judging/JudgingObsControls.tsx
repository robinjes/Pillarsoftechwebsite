'use client'

import { useState } from 'react'
import { Copy, ExternalLink, Tv } from 'lucide-react'
import { primaryButton, secondaryButton, sendJson } from '../feedback/admin-ui'
import type { BroadcastMode } from '@/lib/judging-broadcast'

const views: Array<{ mode: BroadcastMode; title: string; description: string }> = [
  { mode: 'live', title: 'Live judge screen', description: 'Current student, each judge’s completed total, and the average.' },
  { mode: 'ticker', title: 'Bottom score ticker', description: 'A scrolling leaderboard over a transparent canvas.' },
  { mode: 'results', title: 'Final results', description: 'Ranked results appear when scores are locked. Ties share a place.' },
]

export default function JudgingObsControls({ eventId, demo = false }: { eventId: string; demo?: boolean }) {
  const [access, setAccess] = useState<{ token: string; expiresAt: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  async function generate() {
    setBusy(true)
    setError('')
    try {
      setAccess(await sendJson<{ token: string; expiresAt: string }>(demo ? '/api/dev/judging/host/broadcast' : '/api/admin/judging/broadcast', 'POST', { eventId }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OBS links could not be created.')
    } finally {
      setBusy(false)
    }
  }

  function link(mode: BroadcastMode) {
    return `${window.location.origin}/judging/${demo ? 'demo/overlay' : 'overlay'}?view=${mode}#token=${access?.token}`
  }

  async function copy(mode: BroadcastMode) {
    try {
      await navigator.clipboard.writeText(link(mode))
      setCopied(mode)
      setError('')
    } catch {
      setError('Clipboard unavailable. Select and copy the link below.')
    }
  }

  return (
    <section className="border border-midnight/25 bg-warm p-5" aria-label="OBS broadcast">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-midnight"><Tv className="h-5 w-5" aria-hidden="true" /> OBS broadcast</h2>
      <p className="mt-1 text-sm text-ink/70">Bring the judging panel onto your stream. Views update automatically every 3 seconds and follow this event, even after it ends.</p>
      <ol className="mt-3 list-inside list-decimal text-sm text-ink/80">
        <li>Generate links, then copy a view below.</li>
        <li>In OBS, add a Browser source and paste its URL.</li>
        <li>Set Width to 1920 and Height to 1080. Position the ticker at the bottom of your scene.</li>
      </ol>
      <p className="mt-2 text-xs text-ink/65">Links allow read-only access to student names, projects, judge names, and scores for 7 days. Share only with your stream team. Judge sign-in codes and comments stay private.</p>
      <button type="button" className={`${primaryButton} mt-4`} disabled={busy} onClick={generate}>{busy ? 'Generating…' : access ? 'Generate fresh OBS links' : 'Generate OBS links'}</button>
      {error ? <p role="alert" className="mt-2 text-sm text-red-900">{error}</p> : null}
      {access ? <>
        <p className="mt-2 text-xs text-ink/65">Expires {new Date(access.expiresAt).toLocaleString()}. Existing links remain valid until their expiry.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {views.map((view) => <div key={view.mode} className="border border-midnight/20 bg-white/50 p-4">
            <h3 className="font-semibold text-midnight">{view.title}</h3>
            <p className="mt-1 text-sm text-ink/70">{view.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => copy(view.mode)}><Copy className="h-4 w-4" aria-hidden="true" />{copied === view.mode ? 'Copied' : 'Copy URL'}</button>
              <a className={secondaryButton} href={link(view.mode)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" aria-hidden="true" />Preview<span className="sr-only"> {view.title} (new tab)</span></a>
            </div>
            <input aria-label={`${view.title} URL`} className="mt-3 w-full border border-midnight/20 bg-white p-2 font-mono text-xs" readOnly value={link(view.mode)} onFocus={(event) => event.target.select()} />
          </div>)}
        </div>
      </> : null}
      <a className="mt-3 inline-block text-xs underline" href="https://obsproject.com/kb/Browser-Source" target="_blank" rel="noopener noreferrer">OBS Browser Source guide</a>
    </section>
  )
}
