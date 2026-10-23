'use client'

import { useEffect, useRef } from 'react'

import { QNA_VISITOR_STORAGE_KEY } from '@/lib/qna-contracts'

function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

let memoryToken: string | null = null

/** Anonymous per-device id used only to dedupe votes and pace submissions. */
export function getVisitorToken(): string {
  try {
    const stored = window.localStorage.getItem(QNA_VISITOR_STORAGE_KEY)
    if (stored && /^[A-Za-z0-9_-]{43}$/.test(stored)) return stored
    const created = randomToken()
    window.localStorage.setItem(QNA_VISITOR_STORAGE_KEY, created)
    return created
  } catch {
    memoryToken ??= randomToken()
    return memoryToken
  }
}

export function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private browsing can block storage; the page still works without it.
  }
}

/** Poll while the tab is visible, and immediately when it becomes visible. */
export function usePolling(callback: () => void, intervalMs: number) {
  const saved = useRef(callback)
  useEffect(() => {
    saved.current = callback
  }, [callback])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const tick = () => saved.current()
    const start = () => {
      if (timer) return
      tick()
      timer = setInterval(tick, intervalMs)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop())

    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', tick)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', tick)
    }
  }, [intervalMs])
}

export function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
