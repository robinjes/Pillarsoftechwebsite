'use client'

import { useEffect, useState } from 'react'
import { timerDisplay, type JudgingTimer as Timer, type TimerAction } from '@/lib/judging-timer'
import { secondaryButton } from '../feedback/admin-ui'
import styles from './JudgingTimer.module.css'

const colors = {
  idle: { background: '#f7f3eb', color: '#0d2b4a', borderColor: '#0d2b4a' },
  green: { background: '#dcfce7', color: '#14532d', borderColor: '#15803d' },
  yellow: { background: '#fef08a', color: '#713f12', borderColor: '#a16207' },
  red: { background: '#b91c1c', color: '#ffffff', borderColor: '#7f1d1d' },
}

export default function JudgingTimer({ timer, contestantName, busy = false, onControl }: {
  timer?: Timer
  contestantName?: string
  busy?: boolean
  onControl?: (action: TimerAction) => void
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    // Anchor to the server clock and advance locally between polls. Reloads and
    // background tabs recover from the same deadline, rather than counting ticks.
    const serverTime = timer?.serverNow ? Date.parse(timer.serverNow) : Date.now()
    const received = performance.now()
    const tick = () => setNow(serverTime + performance.now() - received)
    tick()
    const interval = setInterval(tick, 200)
    return () => clearInterval(interval)
  }, [timer?.serverNow, timer?.endsAt])
  const display = timerDisplay(timer, now)
  const phase = timer?.phase === 'qa' ? 'Q&A' : timer?.phase === 'pitch' ? 'Pitch' : 'Pitch / Q&A'
  const disabled = busy || !contestantName

  return <section aria-label="Pitch and Q&A timer" className={`mb-4 border-2 p-4 ${display.label === 'STOP' ? styles.expired : ''}`} style={colors[display.color]}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-bold">{phase} timer{contestantName ? ` · ${contestantName}` : ''}</h2>
        <p role="status" aria-live="polite" className="text-lg font-bold">{display.label}</p>
      </div>
      <p role="timer" aria-label={`${phase} time remaining`} aria-live="off" className="font-mono text-5xl font-bold tabular-nums">{display.time}</p>
    </div>
    {onControl ? <>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} disabled={disabled} onClick={() => onControl('pitch')}>Start pitch · 2:00</button>
        <button type="button" className={secondaryButton} disabled={disabled} onClick={() => onControl('qa')}>Start Q&A · 1:00</button>
        <button type="button" className={secondaryButton} disabled={disabled || !timer?.phase || display.seconds === 0} onClick={() => onControl(timer?.endsAt ? 'pause' : 'resume')}>{timer?.endsAt ? 'Pause timer' : 'Resume timer'}</button>
        <button type="button" className={secondaryButton} disabled={busy || !timer?.phase} onClick={() => onControl('reset')}>Reset timer</button>
      </div>
      <p className="mt-3 text-xs">Pitch: green → yellow at 1:00 elapsed → red at 1:30 → STOP at 2:00. Q&A: yellow with 0:30 left → red with 0:10 left → STOP at 1:00.</p>
      <p className="mt-1 text-xs">Start each phase when ready. Selecting another student resets the timer.</p>
    </> : null}
  </section>
}
