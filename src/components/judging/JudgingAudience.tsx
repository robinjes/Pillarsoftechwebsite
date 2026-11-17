'use client'

import { useEffect, useState } from 'react'
import { Clock3, LockKeyhole, Trophy } from 'lucide-react'
import type { JudgingAudienceState } from '@/lib/judging-audience'
import { MAX_TOTAL } from '@/lib/judging-contracts'

export default function JudgingAudience({ demo = false }: { demo?: boolean }) {
  const [data, setData] = useState<JudgingAudienceState | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const eventId = new URLSearchParams(window.location.search).get('eventId')
    if (!eventId) { setError('Scan the event QR code or open the link shared by your host.'); return }
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    async function poll() {
      try {
        const api = demo ? '/api/dev/judging/audience' : '/api/judging/audience'
        const response = await fetch(`${api}?eventId=${encodeURIComponent(eventId!)}`, { cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (stopped) return
        if (!response.ok) {
          setData(null)
          setError(result.error || 'Event updates are temporarily unavailable.')
          if (response.status === 400 || response.status === 404) return
        } else { setData(result); setError('') }
      } catch {
        if (stopped) return
        setData(null)
        setError('Connection interrupted. Reconnecting to event updates…')
      }
      if (!stopped) timer = setTimeout(poll, 4_000)
    }
    void poll()
    return () => { stopped = true; controller.abort(); clearTimeout(timer) }
  }, [demo])

  return <main className="min-h-screen bg-cream px-4 py-8 text-midnight sm:py-12">
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">Pillars of Tech · Family event updates{demo ? ' · Demo' : ''}</p>
        <h1 className="mt-3 break-words font-display text-4xl font-semibold tracking-tight">{data?.title ?? 'Welcome, families'}</h1>
        <p className="mt-2 text-sm text-ink/70">Cheer on every student. Stay for the awards and celebrate together.</p>
      </header>
      {error || !data ? <p role="status" className="border border-midnight/25 bg-warm p-5">{error || 'Connecting to the event…'}</p> : <>
        <section className="mb-5 border-2 border-midnight bg-midnight p-6 text-warm" aria-label="Event progress">
          <p className="text-xs font-bold uppercase tracking-widest text-sky">{data.isLive ? 'Now presenting' : 'Presentations have ended'}</p>
          <h2 className="mt-2 break-words font-display text-3xl font-semibold">{data.current?.name ?? (data.isLive ? 'Waiting for the next presentation' : 'Thank you for cheering on our students!')}</h2>
          {data.current?.project ? <p className="mt-1 text-sky">{data.current.project}</p> : null}
          <p className="mt-5 text-sm">{data.presentationNumber && data.isLive ? `Presentation ${data.presentationNumber} of ${data.totalPresentations}` : `${data.totalPresentations} students on the program`}</p>
          {data.presentationNumber && data.isLive ? <div role="progressbar" aria-label="Presentation progress" aria-valuemin={0} aria-valuemax={data.totalPresentations} aria-valuenow={data.presentationNumber} className="mt-2 h-2 bg-white/20"><div className="h-full bg-sun" style={{ width: `${data.presentationNumber / data.totalPresentations * 100}%` }} /></div> : null}
          {data.next ? <div className="mt-5 border-t border-sky/30 pt-4"><p className="text-xs font-bold uppercase tracking-widest text-sky">Up next</p><p className="mt-1 break-words text-lg font-semibold">{data.next.name}</p>{data.next.project ? <p className="text-sm text-sky">{data.next.project}</p> : null}</div> : null}
        </section>
        <section className="mb-5 border border-midnight/25 bg-sun p-5" aria-labelledby="family-awards-heading">
          <h2 id="family-awards-heading" className="flex items-center gap-2 font-display text-xl font-semibold"><Clock3 className="h-5 w-5" aria-hidden="true" /> Awards presentation</h2>
          <p className="mt-2 whitespace-pre-wrap">{data.awardsMessage}</p>
        </section>
        <section className="border border-midnight/25 bg-warm p-5" aria-labelledby="family-results-heading">
          <h2 id="family-results-heading" className="flex items-center gap-2 font-display text-2xl font-semibold">{data.resultsReleased ? <Trophy className="h-6 w-6" aria-hidden="true" /> : <LockKeyhole className="h-6 w-6" aria-hidden="true" />}{data.resultsReleased ? 'Final results' : 'Scores coming after awards'}</h2>
          {!data.resultsReleased ? <p className="mt-3 leading-7">Scores will be released after the awards presentation. Keep this page open; everyone’s results will appear together when the host releases them.</p> : <>
            <p className="mt-2 text-sm text-ink/70">Average of complete judge rubrics, out of {MAX_TOTAL}. Equal scores share a place.</p>
            <ol className="mt-4 divide-y divide-midnight/15">{data.results?.map((row, index) => <li key={index} className="flex items-center gap-3 py-4">
              <span className="w-8 shrink-0 text-center font-display text-2xl font-semibold" aria-label={row.rank === null ? 'Unranked' : `Place ${row.rank}`}>{row.rank ?? '—'}</span>
              <div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{row.name}</h3>{row.project ? <p className="break-words text-sm text-ink/70">{row.project}</p> : null}</div>
              <span className="shrink-0 font-mono text-lg font-bold">{row.average === null ? 'No score' : `${row.average.toFixed(1)} / ${MAX_TOTAL}`}</span>
            </li>)}</ol>
            {data.results?.length === 0 ? <p className="mt-4">No results for this event.</p> : null}
          </>}
        </section>
        <p className="mt-5 text-center text-xs text-ink/65">Updates automatically · No sign-in needed</p>
      </>}
    </div>
  </main>
}
