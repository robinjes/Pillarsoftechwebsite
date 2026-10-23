'use client'

import { useEffect, useRef } from 'react'
import { ThumbsUp, X } from 'lucide-react'

import type { QnaAdminQuestion } from '@/lib/qna-contracts'

type Props = {
  title: string
  question: QnaAdminQuestion | null
  audienceUrl: string
  qrDataUrl: string
  totalQuestions: number
  onClose: () => void
}

/**
 * Full-screen projector view. It reuses the host page's polling, so whatever
 * the host highlights appears here within a few seconds. Esc or the close
 * button returns to the host controls.
 */
export default function QnaPresenter({ title, question, audienceUrl, qrDataUrl, totalQuestions, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const displayUrl = audienceUrl.replace(/^https?:\/\//, '')
  // The host re-renders on every poll; keep the effect from re-running (and
  // leaving fullscreen) just because the close callback identity changed.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const root = rootRef.current
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root?.requestFullscreen?.().catch(() => {
      // Fullscreen can be refused; the fixed overlay still fills the window.
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.body.style.overflow = previousOverflow
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Presenter screen"
      className="fixed inset-0 z-[100] flex flex-col bg-midnight p-[4vmin] text-warm"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-display text-[clamp(0.9rem,1.6vw,1.4rem)] font-bold uppercase tracking-[0.18em] text-sky">Live Q&amp;A</p>
          <h2 className="font-display text-[clamp(1.5rem,3vw,3rem)] font-semibold leading-tight">{title}</h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close presenter screen"
          className="inline-flex min-h-11 min-w-11 items-center justify-center border border-white/30 text-warm/70 transition-colors hover:bg-white/10 hover:text-warm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 items-center gap-[5vmin]">
        <div className="min-w-0 flex-1">
          {question ? (
            <figure>
              <blockquote className="font-display text-[clamp(2rem,5vw,5.5rem)] font-semibold leading-[1.1] tracking-[-0.02em] break-words">
                {question.body}
              </blockquote>
              <figcaption className="mt-[3vmin] flex items-center gap-6 text-[clamp(1rem,2vw,2rem)] text-warm/75">
                <span>{question.authorName || 'Anonymous'}</span>
                <span className="inline-flex items-center gap-2">
                  <ThumbsUp className="h-[1em] w-[1em]" aria-hidden="true" /> {question.upvotes}
                </span>
              </figcaption>
            </figure>
          ) : (
            <div>
              <p className="font-display text-[clamp(2.25rem,6vw,6rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
                Ask the panel anything.
              </p>
              <p className="mt-[2vmin] text-[clamp(1.1rem,2.2vw,2.25rem)] text-warm/75">
                Scan the code or go to <span className="font-bold text-sun">{displayUrl}</span>
              </p>
              <p className="mt-[2vmin] text-[clamp(1rem,1.6vw,1.5rem)] text-warm/60">
                {totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'} so far
              </p>
            </div>
          )}
        </div>

        {qrDataUrl ? (
          <div className="flex shrink-0 flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL generated in the browser */}
            <img
              src={qrDataUrl}
              alt={`QR code for ${audienceUrl}`}
              className={`${question ? 'h-[22vmin] w-[22vmin]' : 'h-[45vmin] w-[45vmin]'} bg-white p-[1vmin] transition-all`}
            />
            <p className="text-[clamp(0.9rem,1.5vw,1.5rem)] font-bold text-sun">{displayUrl}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
