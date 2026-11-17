import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import JudgingTimer from '@/components/judging/JudgingTimer'
import { controlDemoTimer, idleTimer, timerDisplay } from '@/lib/judging-timer'

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('pitch and Q&A timing', () => {
  it('matches the pitch time cards at 1:00, 1:30, and STOP', () => {
    const start = Date.now()
    const timer = controlDemoTimer(undefined, 'pitch', start)
    expect(timerDisplay(timer, start)).toMatchObject({ time: '2:00', color: 'green', label: 'Go' })
    expect(timerDisplay(timer, start + 59_999).color).toBe('green')
    expect(timerDisplay(timer, start + 60_000)).toMatchObject({ time: '1:00', color: 'yellow' })
    expect(timerDisplay(timer, start + 90_000)).toMatchObject({ time: '0:30', color: 'red', label: 'Finish now' })
    expect(timerDisplay(timer, start + 120_000)).toMatchObject({ time: '0:00', color: 'red', label: 'STOP' })
    expect(timerDisplay(timer, start + 180_000).time).toBe('0:00')
  })

  it('gives Q&A its own minute and keeps pause/resume and reset consistent', () => {
    const start = Date.now()
    const timer = controlDemoTimer(undefined, 'qa', start)
    expect(timerDisplay(timer, start)).toMatchObject({ time: '1:00', color: 'green' })
    expect(timerDisplay(timer, start + 30_000).color).toBe('yellow')
    expect(timerDisplay(timer, start + 50_000).color).toBe('red')
    const paused = controlDemoTimer(timer, 'pause', start + 20_000)
    expect(timerDisplay(paused, start + 200_000)).toMatchObject({ time: '0:40', label: 'Paused' })
    const resumed = controlDemoTimer(paused, 'resume', start + 200_000)
    expect(timerDisplay(resumed, start + 210_000).time).toBe('0:30')
    expect(controlDemoTimer(resumed, 'reset')).toEqual(idleTimer())
    expect(controlDemoTimer(undefined, 'resume').phase).toBeNull()
  })

  it('advances using server time despite a different device clock and announces STOP', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date', 'performance'] })
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    const serverTime = Date.parse('2026-11-16T00:00:00Z')
    const timer = { ...controlDemoTimer(undefined, 'pitch', serverTime), serverNow: new Date(serverTime).toISOString() }
    render(<JudgingTimer timer={timer} />)
    expect(screen.getByRole('timer')).toHaveTextContent('2:00')
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(screen.getByRole('timer')).toHaveTextContent('1:00')
    expect(screen.getByRole('status')).toHaveTextContent('Wrap up')
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(screen.getByRole('status')).toHaveTextContent('STOP')
    expect(screen.getByRole('timer')).toHaveTextContent('0:00')
  })

  it('only provides controls to the host and requires a selected student', () => {
    const control = vi.fn()
    const { rerender } = render(<JudgingTimer onControl={control} />)
    expect(screen.getByRole('button', { name: 'Start pitch · 2:00' })).toBeDisabled()
    rerender(<JudgingTimer contestantName="Alex" onControl={control} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start pitch · 2:00' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start Q&A · 1:00' }))
    expect(control.mock.calls).toEqual([['pitch'], ['qa']])
    rerender(<JudgingTimer timer={controlDemoTimer(undefined, 'pitch')} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
