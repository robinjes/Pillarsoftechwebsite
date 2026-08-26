'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

const TANK_VIDEO = '/videos/home/wildcat-tank-timelapse-720p.mp4'
const CARNIVAL_VIDEO = '/videos/home/wildcat-carnival-timelapse-720p.mp4'
const TANK_POSTER = '/images/home/wildcat-tank-poster.jpg'
const CARNIVAL_POSTER = '/images/home/wildcat-carnival-poster.jpg'
const PLAYBACK_INTERVAL_MS = 14_000

export default function TimelapseHero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false)
  const [autoplayFailed, setAutoplayFailed] = useState(false)
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([])
  const timerRef = useRef<number | null>(null)
  const activeIndexRef = useRef(0)

  const clearPlaybackTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const advanceVideo = useCallback(() => {
    if (reducedMotion || autoplayFailed) return
    clearPlaybackTimer()
    setActiveIndex((index) => (index + 1) % 2)
  }, [autoplayFailed, clearPlaybackTimer, reducedMotion])

  const attemptPlayback = useCallback(async () => {
    if (!motionPreferenceReady || reducedMotion || autoplayFailed || document.hidden) return
    const video = videoRefs.current[activeIndexRef.current]
    if (!video) return

    video.muted = true
    try {
      await video.play()
      clearPlaybackTimer()
      timerRef.current = window.setTimeout(advanceVideo, PLAYBACK_INTERVAL_MS)
    } catch {
      // A browser can reject autoplay for policy, battery, or data reasons.
      // The poster remains in place as the complete, useful fallback.
      clearPlaybackTimer()
      setAutoplayFailed(true)
    }
  }, [advanceVideo, autoplayFailed, clearPlaybackTimer, motionPreferenceReady, reducedMotion])

  useEffect(() => {
    activeIndexRef.current = activeIndex
    const video = videoRefs.current[activeIndex]
    if (!video) return

    clearPlaybackTimer()
    video.muted = true
    if (!motionPreferenceReady || reducedMotion || autoplayFailed) {
      video.pause()
      return
    }

    if (activeIndex === 1) {
      // The second film is intentionally not fetched until the first one has
      // earned a place in the hero.
      video.preload = 'metadata'
      video.load()
    }
    void attemptPlayback()

    return () => {
      clearPlaybackTimer()
      video.pause()
    }
  }, [activeIndex, attemptPlayback, autoplayFailed, clearPlaybackTimer, motionPreferenceReady, reducedMotion])

  useEffect(() => {
    const currentVideos = videoRefs.current
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = (event: MediaQueryListEvent | MediaQueryList) => {
      setReducedMotion(event.matches)
      setMotionPreferenceReady(true)
      if (event.matches) {
        clearPlaybackTimer()
        currentVideos.forEach((video) => video?.pause())
      }
    }

    updateMotionPreference(motionPreference)
    motionPreference.addEventListener?.('change', updateMotionPreference)

    const handleVisibility = () => {
      if (document.hidden) {
        clearPlaybackTimer()
        currentVideos.forEach((video) => video?.pause())
      } else {
        void attemptPlayback()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      motionPreference.removeEventListener?.('change', updateMotionPreference)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearPlaybackTimer()
      currentVideos.forEach((video) => video?.pause())
    }
  }, [attemptPlayback, clearPlaybackTimer])

  const heroMediaClass = `hero-media${autoplayFailed || reducedMotion ? ' hero-media--poster-only' : ''}`

  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className={heroMediaClass} aria-hidden="true">
        <Image
          className="hero-media__poster"
          src={activeIndex === 0 ? TANK_POSTER : CARNIVAL_POSTER}
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <video
          ref={(element) => { videoRefs.current[0] = element }}
          className={`hero-video${activeIndex === 0 ? ' is-active' : ''}`}
          data-hero-video="wildcat-tank"
          muted
          playsInline
          preload="metadata"
          poster={TANK_POSTER}
          onEnded={advanceVideo}
        >
          <source src={TANK_VIDEO} type="video/mp4" />
        </video>
        <video
          ref={(element) => { videoRefs.current[1] = element }}
          className={`hero-video${activeIndex === 1 ? ' is-active' : ''}`}
          data-hero-video="wildcat-carnival"
          muted
          playsInline
          preload="none"
          poster={CARNIVAL_POSTER}
          onEnded={advanceVideo}
        >
          <source src={CARNIVAL_VIDEO} type="video/mp4" />
        </video>
        <div className="hero-wash" />
      </div>

      <div className="hero-content shell">
        <p className="eyebrow eyebrow--light">Hands-on STEM for young people</p>
        <h1 id="hero-title">STEM belongs in every student’s hands.</h1>
        <p className="hero-copy">
          Friendly, hands-on events that help young people build, explore, and ask big questions. No tech experience needed.
        </p>
        <div className="hero-actions" aria-label="Homepage actions">
          <Link className="button button--sun focus-ring" href="#events">Find a family event</Link>
          <Link className="button button--glass focus-ring" href="#families">What to expect</Link>
        </div>
      </div>
    </section>
  )
}
