'use client'

import { useEffect, useState } from 'react'
import JudgingTimer from './JudgingTimer'
import { MAX_TOTAL } from '@/lib/judging-contracts'
import type { BroadcastMode, JudgingBroadcast } from '@/lib/judging-broadcast'

const format = (value: number | null) => value === null ? 'Waiting' : `${value.toFixed(1)} / ${MAX_TOTAL}`

export default function JudgingOverlay({ demo = false }: { demo?: boolean }) {
  const [mode, setMode] = useState<BroadcastMode>('live')
  const [data, setData] = useState<JudgingBroadcast | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get('view')
    setMode(view === 'ticker' || view === 'results' ? view : 'live')
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (!token) {
      setError('Open an OBS link from the admin judging panel.')
      return
    }
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    async function poll() {
      try {
        const response = await fetch(demo ? '/api/dev/judging/broadcast' : '/api/judging/broadcast', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (stopped) return
        if (!response.ok) {
          setData(null)
          setError(result.error || 'Broadcast unavailable.')
          if (response.status === 401 || response.status === 404) return
        } else {
          setData(result)
          setError('')
        }
      } catch {
        if (stopped) return
        setData(null)
        setError('Connection interrupted · Reconnecting…')
      }
      if (!stopped) timer = setTimeout(poll, 3_000)
    }
    void poll()
    return () => { stopped = true; controller.abort(); clearTimeout(timer) }
  }, [demo])

  useEffect(() => {
    const timer = setInterval(() => setPage((value) => value + 1), 10_000)
    return () => clearInterval(timer)
  }, [])

  const rows = data?.standings ?? []
  const pageCount = Math.max(1, Math.ceil(rows.length / 8))
  const visible = rows.slice((page % pageCount) * 8, (page % pageCount + 1) * 8)
  const ticker = rows.map((row) => `${row.rank === null ? '—' : `#${row.rank}`} ${row.name} · ${format(row.average)}`).join('     •     ')

  return (
    <main className={`judging-overlay overlay-${mode}`}>
      {error || !data ? <div className="overlay-message" role="status">{error || 'Connecting to judging…'}</div> : mode === 'ticker' ? (
        <div className="overlay-ticker">
          <span className="overlay-ticker-label">{data.final ? 'RESULTS' : 'LIVE SCORES'}</span>
          <div className="overlay-ticker-window"><div className="overlay-ticker-track" style={{ animationDuration: `${Math.max(25, ticker.length / 7)}s` }}>
            {[0, 1].map((copy) => <span key={copy} aria-hidden={copy === 1}>{data.title}     •     {ticker || 'Waiting for students'}     •     </span>)}
          </div></div>
        </div>
      ) : mode === 'results' ? (
        <section className="overlay-panel">
          <p className="overlay-eyebrow">Pillars of Tech · {data.final ? 'Final results' : 'Judging in progress'}</p>
          <h1>{data.title}</h1>
          {!data.final ? <p className="overlay-waiting">Final results will appear when the host locks scores.</p> : <>
            <div className="overlay-standings">{visible.map((row) => <div className="overlay-standing" key={row.position}>
              <strong className="overlay-rank">{row.rank ?? '—'}</strong>
              <div><h2>{row.name}</h2>{row.project ? <p>{row.project}</p> : null}<small>{row.completed} complete {row.completed === 1 ? 'rubric' : 'rubrics'}</small></div>
              <strong>{format(row.average)}</strong>
            </div>)}</div>
            {!rows.length ? <p className="overlay-waiting">No students in this event.</p> : null}
            <p className="overlay-footnote">Average of complete rubrics · Equal scores share a place{pageCount > 1 ? ` · Page ${(page % pageCount) + 1} / ${pageCount}` : ''}</p>
          </>}
        </section>
      ) : (
        <section className="overlay-panel">
          <p className="overlay-eyebrow">Pillars of Tech · {data.final ? 'Scores locked' : 'Now judging'} · {data.title}</p>
          <h1>{data.current?.name ?? 'Waiting for the next student'}</h1>
          {data.current ? <>
            <p className="overlay-project">{data.current.project}</p>
            <div className="overlay-timer"><JudgingTimer timer={data.timer} /></div>
            <div className="overlay-judge-grid">{data.current.judges.map((judge, index) => <div className="overlay-judge" key={index}><h2>{judge.name}</h2><strong>{format(judge.total)}</strong></div>)}</div>
            <div className="overlay-average"><span>Average score</span><strong>{format(data.current.average)}</strong></div>
            <p className="overlay-footnote">Complete rubrics only · {data.final ? 'Scores locked' : 'Live scores are provisional'}</p>
          </> : null}
        </section>
      )}
    </main>
  )
}
