import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrambleText } from '@/components/site/useScrambleText'

const phrases = ['STEM belongs in every student’s hands.', 'Breaking barriers. Building innovators.']

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('homepage headline scramble', () => {
  it('holds each readable phrase, scrambles briefly, and loops through the messages', () => {
    const { result } = renderHook(() => useScrambleText(phrases, true))
    expect(result.current).toBe(phrases[0])
    act(() => vi.advanceTimersByTime(4_500))
    expect(result.current).toBe(phrases[0])
    act(() => vi.advanceTimersByTime(630))
    expect(result.current).toBe(phrases[1])
    act(() => vi.advanceTimersByTime(5_130))
    expect(result.current).toBe(phrases[0])
  })

  it('stays static when motion is disabled and cancels a transition when paused', () => {
    const { result, rerender } = renderHook(({ active }) => useScrambleText(phrases, active), { initialProps: { active: false } })
    act(() => vi.advanceTimersByTime(20_000))
    expect(result.current).toBe(phrases[0])
    expect(vi.getTimerCount()).toBe(0)
    rerender({ active: true })
    act(() => vi.advanceTimersByTime(4_700))
    rerender({ active: false })
    expect(result.current).toBe(phrases[0])
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current).toBe(phrases[0])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears timers when leaving the homepage', () => {
    const { unmount } = renderHook(() => useScrambleText(phrases, true))
    act(() => vi.advanceTimersByTime(4_700))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
