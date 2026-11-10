'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScrambleText } from '@/components/site/useScrambleText'

const HERO_HEADLINES = [
  'STEM belongs in every student’s hands.',
  'Breaking barriers. Building innovators.',
  'Big ideas start with curious minds.',
  'Explore science. Build your future.',
] as const

const TANK_VIDEO = '/videos/home/wildcat-tank-timelapse-720p.mp4'
const CARNIVAL_VIDEO = '/videos/home/wildcat-carnival-timelapse-720p.mp4'
const TANK_POSTER = '/images/home/wildcat-tank-poster.jpg'
const CARNIVAL_POSTER = '/images/home/wildcat-carnival-poster.jpg'
const PLAYBACK_INTERVAL_MS = 6_000
const HERO_SLIDES = [
  { id: 'wildcat-tank', image: TANK_POSTER },
  { id: 'wildcat-carnival-photo', image: '/images/events/wildcat-carnival/drive-01.webp' },
  { id: 'altamont-open-house', image: '/images/events/altamont-creek-open-house/hero.png' },
  { id: 'marshmallow-challenge', image: '/images/events/science-odyssey/drive-01.webp' },
  { id: 'wildcat-carnival', image: CARNIVAL_POSTER },
  { id: 'wildcat-tank-photo', image: '/images/events/wildcat-tank-altamont/drive-01.webp' },
]

export default function TimelapseHero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false)
  const [autoplayFailed, setAutoplayFailed] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [headlinePaused, setHeadlinePaused] = useState(false)
  const headline = useScrambleText(HERO_HEADLINES, motionPreferenceReady && !reducedMotion && pageVisible && !headlinePaused)
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([])
  const timerRef = useRef<number | null>(null)

  const clearPlaybackTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const advanceMedia = useCallback(() => {
    if (reducedMotion || document.hidden) return
    clearPlaybackTimer()
    setActiveIndex((index) => (index + 1) % HERO_SLIDES.length)
  }, [clearPlaybackTimer, reducedMotion])

  useEffect(() => {
    const video = videoRefs.current[activeIndex]
    clearPlaybackTimer()
    if (!motionPreferenceReady || reducedMotion || !pageVisible || document.hidden) {
      video?.pause()
      return
    }
    let cancelled = false
    if (video && !autoplayFailed) {
      video.muted = true
      if (video.preload === 'none') {
        // Fetch the Carnival film only when its slide is first shown.
        video.preload = 'metadata'
        video.load()
      }
      video.currentTime = 0
      void video.play().catch(() => {
        if (!cancelled) setAutoplayFailed(true)
      })
    }
    // Photos and video posters keep rotating even if autoplay is blocked.
    timerRef.current = window.setTimeout(advanceMedia, PLAYBACK_INTERVAL_MS)

    return () => {
      cancelled = true
      clearPlaybackTimer()
      video?.pause()
    }
  }, [activeIndex, advanceMedia, autoplayFailed, clearPlaybackTimer, motionPreferenceReady, pageVisible, reducedMotion])

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
      setPageVisible(!document.hidden)
      if (document.hidden) {
        clearPlaybackTimer()
        currentVideos.forEach((video) => video?.pause())
      }
    }
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      motionPreference.removeEventListener?.('change', updateMotionPreference)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearPlaybackTimer()
      currentVideos.forEach((video) => video?.pause())
    }
  }, [clearPlaybackTimer])

  const heroMediaClass = `hero-media${autoplayFailed || reducedMotion ? ' hero-media--poster-only' : ''}`

  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className={heroMediaClass} aria-hidden="true" data-hero-slide={HERO_SLIDES[activeIndex].id}>
        {HERO_SLIDES.map((slide, index) => <Image
          key={slide.id}
          className={`hero-media__poster${activeIndex === index ? ' is-active' : ''}`}
          src={slide.image}
          alt=""
          fill
          priority={index === 0}
          sizes="100vw"
        />)}
        <video
          ref={(element) => { videoRefs.current[0] = element }}
          className={`hero-video${activeIndex === 0 ? ' is-active' : ''}`}
          data-hero-video="wildcat-tank"
          muted
          playsInline
          preload="metadata"
          poster={TANK_POSTER}
          onEnded={activeIndex === 0 ? advanceMedia : undefined}
          onError={() => { if (activeIndex === 0) setAutoplayFailed(true) }}
        >
          <source src={TANK_VIDEO} type="video/mp4" />
        </video>
        <video
          ref={(element) => { videoRefs.current[4] = element }}
          className={`hero-video${activeIndex === 4 ? ' is-active' : ''}`}
          data-hero-video="wildcat-carnival"
          muted
          playsInline
          preload="none"
          poster={CARNIVAL_POSTER}
          onEnded={activeIndex === 4 ? advanceMedia : undefined}
          onError={() => { if (activeIndex === 4) setAutoplayFailed(true) }}
        >
          <source src={CARNIVAL_VIDEO} type="video/mp4" />
        </video>
        <div className="hero-wash" />
      </div>

      <div className="hero-content shell">
        <p className="eyebrow eyebrow--light">A place to build, explore, and belong</p>
        <h1 id="hero-title">
          <span className="sr-only">STEM belongs in every student’s hands.</span>
          <span className="relative grid" aria-hidden="true">
            {HERO_HEADLINES.map((phrase) => <span key={phrase} className="invisible col-start-1 row-start-1 select-none">{phrase}</span>)}
            <span className="absolute inset-0">{headline}</span>
          </span>
        </h1>
        <div className="hero-copy">
          <p>Bring your curiosity. Try an experiment, build something new, and learn alongside friendly volunteers.</p>
          <p>For kids and families. No tech experience needed.</p>
        </div>
        <div className="hero-actions" aria-label="Homepage actions">
          <Link className="button button--sun focus-ring" href="#events">Find A Family Event</Link>
          <Link className="button button--glass focus-ring" href="#families">What To Expect</Link>
          {motionPreferenceReady && !reducedMotion ? <button type="button" onClick={() => setHeadlinePaused((paused) => !paused)} aria-pressed={headlinePaused} className="focus-ring inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--cream)] underline underline-offset-4">
            {headlinePaused ? 'Resume headline' : 'Pause headline'}
          </button> : null}
        </div>
      </div>
    </section>
  )
}
