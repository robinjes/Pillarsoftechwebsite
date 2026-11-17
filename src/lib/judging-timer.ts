import { z } from 'zod'

export interface JudgingTimer {
  phase: 'pitch' | 'qa' | null
  endsAt: string | null
  remainingSeconds: number
  serverNow?: string
}

export const timerControlSchema = z.strictObject({
  eventId: z.uuid(),
  contestantId: z.uuid().nullable(),
  action: z.enum(['pitch', 'qa', 'pause', 'resume', 'reset']),
})
export type TimerAction = z.infer<typeof timerControlSchema>['action']

export const idleTimer = (): JudgingTimer => ({ phase: null, endsAt: null, remainingSeconds: 0 })

export function timerDisplay(timer: JudgingTimer | undefined, now = Date.now()) {
  const seconds = !timer?.phase ? 0 : timer.endsAt
    ? Math.max(0, Math.ceil((Date.parse(timer.endsAt) - now) / 1000))
    : timer.remainingSeconds
  const color: 'idle' | 'green' | 'yellow' | 'red' = !timer?.phase ? 'idle' : seconds <= (timer.phase === 'pitch' ? 30 : 10) ? 'red'
    : seconds <= (timer.phase === 'pitch' ? 60 : 30) ? 'yellow' : 'green'
  return {
    seconds, color,
    time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    label: !timer?.phase ? 'Ready' : seconds === 0 ? 'STOP' : !timer.endsAt ? 'Paused'
      : color === 'red' ? 'Finish now' : color === 'yellow' ? 'Wrap up' : 'Go',
  }
}

/** The demo follows the same deadline-based controls as the database RPC. */
export function controlDemoTimer(timer: JudgingTimer | undefined, action: TimerAction, now = Date.now()): JudgingTimer {
  if (action === 'reset') return idleTimer()
  if (action === 'pitch' || action === 'qa') {
    const duration = action === 'pitch' ? 120 : 60
    return { phase: action, endsAt: new Date(now + duration * 1000).toISOString(), remainingSeconds: duration }
  }
  const next = { ...(timer ?? idleTimer()) }
  if (action === 'pause' && next.endsAt) {
    next.remainingSeconds = timerDisplay(next, now).seconds
    next.endsAt = null
  } else if (action === 'resume' && next.phase && !next.endsAt && next.remainingSeconds > 0) {
    next.endsAt = new Date(now + next.remainingSeconds * 1000).toISOString()
  }
  return next
}
