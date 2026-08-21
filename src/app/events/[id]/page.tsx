'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, ExternalLink, FileText, MapPin, Play, X } from 'lucide-react'
import type { PublicEvent } from '@/lib/content-contracts'
import { resolveEventImageAlt } from '@/lib/event-media'
import { toYouTubeEmbedUrl } from '@/lib/event-utils'

function localAsset(value?: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  if (value.includes('..') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return null
  return value
}

const archiveHeroFallback = '/images/events/family-science-night/IMG_8332.JPG'
const archiveHeroFallbackAlt = 'A Pillars of Tech volunteer and participant operate a VEX robot during Family Science Night.'

function paragraphs(description: string): string[] {
  return description.split('\n\n').map((paragraph) => paragraph.trim()).filter(Boolean)
}

function participantState(event: PublicEvent): { label: string; tone: string; canRegister: boolean } {
  if (event.status === 'completed' || event.status === 'cancelled') return { label: 'Registration closed', tone: 'border-[var(--ink)] text-[var(--ink)]/70', canRegister: false }
  if (event.participantRegistrationState === 'open') return { label: 'Participant registration open', tone: 'border-[var(--cobalt)] bg-[var(--sky)] text-[var(--midnight)]', canRegister: true }
  if (event.participantRegistrationState === 'full') return { label: 'Participant list is full', tone: 'border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]/75', canRegister: false }
  return { label: 'Participant registration closed', tone: 'border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]/75', canRegister: false }
}

function volunteerState(event: PublicEvent): { label: string; canRegister: boolean } {
  if (event.status === 'completed' || event.status === 'cancelled') return { label: 'Volunteer sign-up closed', canRegister: false }
  if (event.volunteerRegistrationState === 'open') return { label: 'Volunteer sign-up open', canRegister: true }
  if (event.volunteerRegistrationState === 'full') return { label: 'Volunteer list is full', canRegister: false }
  return { label: 'Volunteer sign-up closed', canRegister: false }
}

function dateLabel(event: PublicEvent): string {
  return event.date || event.startLabel || 'Date to be announced'
}

function timeLabel(event: PublicEvent): string {
  return event.time || event.endLabel || 'Time to be announced'
}

function getFocusableElements(dialog: HTMLDivElement | null): HTMLElement[] {
  if (!dialog) return []
  return Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])'))
}

export default function EventPage() {
  const params = useParams<{ id: string | string[] }>()
  const router = useRouter()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || ''
  const [event, setEvent] = useState<PublicEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [heroSlideIndex, setHeroSlideIndex] = useState(0)
  const [heroVideoOk, setHeroVideoOk] = useState(true)
  const [galleryActiveImage, setGalleryActiveImage] = useState<string | null>(null)
  const [pdfFullscreen, setPdfFullscreen] = useState(false)
  const galleryTriggerRef = useRef<HTMLButtonElement | null>(null)
  const galleryDialogRef = useRef<HTMLDivElement>(null)
  const galleryCloseButtonRef = useRef<HTMLButtonElement>(null)
  const galleryIndexRef = useRef(-1)
  const pdfTriggerRef = useRef<HTMLButtonElement | null>(null)
  const pdfDialogRef = useRef<HTMLDivElement>(null)
  const pdfCloseButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let mounted = true
    if (!id) {
      setLoading(false)
      return
    }

    fetch('/api/events')
      .then(async (response) => {
        if (!response.ok) throw new Error('Events unavailable')
        const data: unknown = await response.json()
        return Array.isArray(data) ? data as PublicEvent[] : []
      })
      .then((events) => {
        if (!mounted) return
        setEvent(events.find((item) => item.id === id || item.slug === id) || null)
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setLoadError(true)
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [id])

  const heroImages = useMemo(() => {
    if (!event) return []
    return Array.from(new Set([event.heroImage, event.image, ...(event.gallery || [])].map(localAsset).filter((value): value is string => Boolean(value))))
  }, [event])
  const galleryImages = useMemo(() => {
    if (!event) return []
    return Array.from(new Set([event.image, ...(event.gallery || [])].map(localAsset).filter((value): value is string => Boolean(value))))
  }, [event])
  const heroImage = heroImages[heroSlideIndex] || heroImages[0]
  const participant = event ? participantState(event) : null
  const volunteer = event ? volunteerState(event) : null
  const embedVideos = useMemo(() => {
    if (!event) return []
    return (event.youtubeVideos || [])
      .map((original) => ({ original, embed: toYouTubeEmbedUrl(original) }))
      .filter((video): video is { original: string; embed: string } => Boolean(video.embed))
  }, [event])
  const localPdf = localAsset(event?.pdfUrl)
  const localHeroVideo = localAsset(event?.heroVideo)
  const heroUsesArchiveFallback = !heroImage && (!localHeroVideo || !heroVideoOk)
  const heroImageToShow = heroImage || archiveHeroFallback
  const activeGalleryIndex = galleryActiveImage ? galleryImages.indexOf(galleryActiveImage) : -1
  const galleryOpen = galleryActiveImage !== null
  const pdfOpen = pdfFullscreen
  galleryIndexRef.current = activeGalleryIndex

  useEffect(() => {
    setHeroSlideIndex(0)
    setHeroVideoOk(true)
    setGalleryActiveImage(null)
    setPdfFullscreen(false)
  }, [event?.id])

  useEffect(() => {
    if (!galleryOpen) {
      const opener = galleryTriggerRef.current
      if (opener) {
        window.requestAnimationFrame(() => opener.focus())
        galleryTriggerRef.current = null
      }
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const initialFocus = window.requestAnimationFrame(() => galleryCloseButtonRef.current?.focus())

    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault()
        setGalleryActiveImage(null)
        return
      }
      if (keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowRight') {
        keyboardEvent.preventDefault()
        const currentIndex = galleryIndexRef.current
        if (currentIndex < 0 || galleryImages.length < 2) return
        const direction = keyboardEvent.key === 'ArrowLeft' ? -1 : 1
        setGalleryActiveImage(galleryImages[(currentIndex + direction + galleryImages.length) % galleryImages.length])
        return
      }
      if (keyboardEvent.key !== 'Tab') return

      const focusable = getFocusableElements(galleryDialogRef.current)
      if (focusable.length === 0) {
        keyboardEvent.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (keyboardEvent.shiftKey && document.activeElement === first) {
        keyboardEvent.preventDefault()
        last.focus()
      } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
        keyboardEvent.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(initialFocus)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [galleryOpen, galleryImages])

  useEffect(() => {
    if (!pdfOpen) {
      const opener = pdfTriggerRef.current
      if (opener) {
        window.requestAnimationFrame(() => opener.focus())
        pdfTriggerRef.current = null
      }
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const initialFocus = window.requestAnimationFrame(() => pdfCloseButtonRef.current?.focus())

    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault()
        setPdfFullscreen(false)
        return
      }
      if (keyboardEvent.key !== 'Tab') return

      const focusable = getFocusableElements(pdfDialogRef.current)
      if (focusable.length === 0) {
        keyboardEvent.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (keyboardEvent.shiftKey && document.activeElement === first) {
        keyboardEvent.preventDefault()
        last.focus()
      } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
        keyboardEvent.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(initialFocus)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pdfOpen])

  if (loading) {
    return <main className="min-h-screen bg-[var(--cream)] px-4 pb-20 pt-12 text-[var(--ink)] sm:pt-16"><p className="mx-auto max-w-5xl font-display text-3xl" role="status">Loading event story…</p></main>
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-[var(--cream)] px-4 pb-20 pt-12 text-[var(--ink)] sm:pt-16">
        <div className="mx-auto max-w-5xl border-y-2 border-[var(--ink)] py-14" role="alert">
          <h1 className="font-display text-4xl text-[var(--midnight)]">The event story is temporarily unavailable.</h1>
          <button type="button" onClick={() => router.push('/events')} className="mt-7 inline-flex min-h-11 items-center gap-2 bg-[var(--cobalt)] px-5 py-2 text-sm font-bold text-[var(--cream)] rounded-[10px]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to events
          </button>
        </div>
      </main>
    )
  }

  if (!event || !participant || !volunteer) {
    return (
      <main className="min-h-screen bg-[var(--cream)] px-4 pb-20 pt-12 text-[var(--ink)] sm:pt-16">
        <div className="mx-auto max-w-5xl border-y-2 border-[var(--ink)] py-14">
          <p className="text-sm font-semibold text-[var(--cobalt)]">404 / story not found</p>
          <h1 className="mt-4 font-display text-5xl text-[var(--midnight)]">That event is not in the public archive.</h1>
          <button type="button" onClick={() => router.push('/events')} className="mt-7 inline-flex min-h-11 items-center gap-2 bg-[var(--cobalt)] px-5 py-2 text-sm font-bold text-[var(--cream)] rounded-[10px]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to events
          </button>
        </div>
      </main>
    )
  }

  const eventParagraphs = paragraphs(event.description)
  const isCurrent = event.status === 'upcoming' || event.status === 'ongoing'
  const registrationHref = `/register/${event.slug || event.id}`
  const volunteerHref = `/volunteer?eventId=${encodeURIComponent(event.slug || event.id)}`

  return (
    <main className="min-h-screen bg-[var(--bone)] pb-20 text-[var(--carbon)]">
      <div className="signal-shell">
        <header className="grid gap-0 border-y border-[var(--ink)] bg-[var(--carbon)] text-[var(--off-white)] lg:grid-cols-[0.86fr_1.14fr]">
          <div className="order-2 flex flex-col justify-between px-5 py-8 sm:px-10 sm:py-12 lg:order-1 lg:py-14">
            <div>
              <button type="button" onClick={() => router.push('/events')} className="signal-text-link signal-text-link--light">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to events
              </button>
              <p className="signal-mono signal-eyebrow mt-8">{event.programCategory} / {isCurrent ? 'NOW & NEXT' : 'ARCHIVE'}</p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[0.94] tracking-[-0.05em] sm:text-5xl">{event.title}</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--off-white)]/72 sm:text-lg sm:leading-8">{event.summary || eventParagraphs[0]}</p>
            </div>
            <div className="mt-9 flex flex-wrap gap-2 text-sm font-semibold">
              <span className="border border-[var(--signal-orange)] px-3 py-2">{event.status === 'ongoing' ? 'In progress' : event.status}</span>
              {isCurrent && event.registrationNote ? <span className="border border-[var(--off-white)]/45 px-3 py-2">{event.registrationNote}</span> : null}
            </div>
          </div>

          <figure className="relative order-1 min-h-[20rem] overflow-hidden border-b border-[var(--signal-orange)] bg-[var(--mist)] lg:order-2 lg:min-h-[34rem] lg:border-b-0 lg:border-l lg:border-[var(--signal-orange)]">
            {localHeroVideo && heroVideoOk ? (
              <video
                className="absolute inset-0 h-full w-full object-cover"
                controls
                playsInline
                preload="metadata"
                poster={heroImage || undefined}
                onError={() => setHeroVideoOk(false)}
                aria-label={`${event.title} event video`}
              >
                <source src={localHeroVideo} />
              </video>
            ) : heroImageToShow ? (
              <Image src={heroImageToShow} alt={heroImage ? resolveEventImageAlt(event, 'hero', heroImage) : archiveHeroFallbackAlt} fill sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" priority />
            ) : (
              <div className="flex h-full min-h-[20rem] items-end p-6 text-sm font-semibold text-[var(--midnight)]">Event documentation</div>
            )}
            {heroImages.length > 1 && !localHeroVideo ? (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-[var(--ink)] bg-[var(--midnight)]/90 p-3 text-[var(--cream)]">
                <button type="button" onClick={() => setHeroSlideIndex((current) => (current - 1 + heroImages.length) % heroImages.length)} className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--cream)] text-[var(--cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)]" aria-label="Previous event image"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
                <span className="text-sm font-semibold">Image {heroSlideIndex + 1} / {heroImages.length}</span>
                <button type="button" onClick={() => setHeroSlideIndex((current) => (current + 1) % heroImages.length)} className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--cream)] text-[var(--cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)]" aria-label="Next event image"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
              </div>
            ) : null}
            <figcaption className="absolute left-4 top-4 border border-[var(--off-white)]/50 bg-[var(--carbon)]/90 px-3 py-2 text-sm font-semibold text-[var(--off-white)]">
              {heroUsesArchiveFallback ? 'Archive image · From a recent Pillars workshop' : isCurrent ? 'Program image' : 'From the event archive'}
            </figcaption>
          </figure>
        </header>

        <section className="grid border-b border-[var(--carbon)]/30 lg:grid-cols-4" aria-label="Event details">
          <div className="border-b border-[var(--carbon)]/25 p-5 lg:border-b-0 lg:border-r"><CalendarDays className="h-5 w-5 text-[var(--ultramarine)]" aria-hidden="true" /><p className="signal-mono mt-3 text-[var(--ultramarine)]">DATE</p><p className="mt-1 font-semibold">{dateLabel(event)}</p></div>
          <div className="border-b border-[var(--carbon)]/25 p-5 lg:border-b-0 lg:border-r"><Clock3 className="h-5 w-5 text-[var(--ultramarine)]" aria-hidden="true" /><p className="signal-mono mt-3 text-[var(--ultramarine)]">TIME</p><p className="mt-1 font-semibold">{timeLabel(event)}</p></div>
          <div className="border-b border-[var(--carbon)]/25 p-5 lg:border-b-0 lg:border-r"><MapPin className="h-5 w-5 text-[var(--ultramarine)]" aria-hidden="true" /><p className="signal-mono mt-3 text-[var(--ultramarine)]">LOCATION</p><p className="mt-1 font-semibold">{event.location || 'Location to be announced'}</p></div>
          <div className="p-5"><p className="signal-mono text-[var(--ultramarine)]">REGISTRATION</p><p className={`mt-3 inline-flex border px-3 py-2 text-sm font-bold ${participant.tone}`}>{participant.label}</p></div>
        </section>

        <div className="grid gap-12 border-b border-[var(--carbon)]/30 py-14 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16">
          <article className="max-w-3xl">
            <p className="signal-mono signal-eyebrow">FIELD REPORT / OBSERVATION · What participants practiced</p>
            <h2 className="mt-3 font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--carbon)]">What happened here</h2>
            <div className="mt-7 space-y-6 text-base leading-8 text-[var(--carbon)]/78">
              {eventParagraphs.map((paragraph, index) => <p key={`${paragraph.slice(0, 24)}-${index}`} className={index === 0 ? 'text-lg leading-8 text-[var(--carbon)]' : undefined}>{paragraph}</p>)}
            </div>
          </article>

          <aside className="h-fit border-t border-[var(--carbon)] pt-5 lg:border-l lg:border-t-0 lg:pl-6">
            <p className="signal-mono signal-eyebrow">NEXT ACTION</p>
            <div className="mt-5 space-y-3">
              {participant.canRegister ? <a href={registrationHref} className="flex min-h-11 items-center justify-between gap-3 bg-[var(--cobalt)] px-4 py-3 text-sm font-bold text-[var(--cream)] hover:bg-[var(--midnight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]">Register as a participant <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a> : <p className="border border-[var(--ink)] px-4 py-3 text-sm font-semibold text-[var(--ink)]/75">{participant.label}</p>}
              {volunteer.canRegister ? <a href={volunteerHref} className="flex min-h-11 items-center justify-between gap-3 border border-[var(--cobalt)] px-4 py-3 text-sm font-bold text-[var(--cobalt)] hover:bg-[var(--sky)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]">Volunteer at this event <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a> : <p className="border border-[var(--ink)] px-4 py-3 text-sm font-semibold text-[var(--ink)]/75">{volunteer.label}</p>}
              {isCurrent && event.registrationLink ? <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 border border-[var(--ink)] px-4 py-3 text-sm font-bold hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]">External event link <ExternalLink className="h-4 w-4" aria-hidden="true" /></a> : null}
              {event.id === 'wildcat-tank-altamont' ? <><a href="/wildcat-tank" className="flex min-h-11 items-center justify-between gap-3 border border-[var(--ink)] px-4 py-3 text-sm font-bold hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]">Results &amp; presentation record <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a><a href="/photos/wildcat-tank" className="flex min-h-11 items-center justify-between gap-3 border border-[var(--ink)] px-4 py-3 text-sm font-bold hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]">Open photo archive <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></> : null}
            </div>
          </aside>
        </div>

        {galleryImages.length > 0 ? (
          <section className="border-b border-[var(--carbon)]/30 py-14" aria-labelledby="gallery-heading">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="signal-mono signal-eyebrow">FIELD IMAGES</p><h2 id="gallery-heading" className="mt-3 font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--carbon)]">From the day</h2></div>
              <p className="text-sm text-[var(--carbon)]/65">Select an image to enlarge it.</p>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {galleryImages.map((image, index) => (
                <button key={image} type="button" onClick={(clickEvent) => { galleryTriggerRef.current = clickEvent.currentTarget; setGalleryActiveImage(image) }} className="group relative aspect-square overflow-hidden border border-[var(--ink)] bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]" aria-label={'Open event image ' + (index + 1)}>
                  <Image src={image} alt={resolveEventImageAlt(event, 'gallery', image, index)} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {(event.pdfUrl || embedVideos.length > 0) ? (
          <section className="border-b border-[var(--carbon)]/30 py-14" aria-labelledby="resources-heading">
            <div><p className="signal-mono signal-eyebrow">APPROVED RESOURCES</p><h2 id="resources-heading" className="mt-3 font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--carbon)]">Keep exploring</h2></div>
            <div className="mt-7 grid gap-8 lg:grid-cols-2">
              {event.pdfUrl ? (
                <article className="border border-[var(--ink)] bg-[var(--paper)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ink)] p-4"><div className="flex items-center gap-2 font-bold text-[var(--midnight)]"><FileText className="h-5 w-5 text-[var(--cobalt)]" aria-hidden="true" /> Event document</div><div className="flex flex-wrap gap-2"><a href={event.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-[var(--cobalt)] px-3 py-2 text-xs font-bold text-[var(--cobalt)]">Open PDF <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>{localPdf ? <button type="button" onClick={(clickEvent) => { pdfTriggerRef.current = clickEvent.currentTarget; setPdfFullscreen(true) }} className="inline-flex min-h-11 items-center border border-[var(--ink)] px-3 py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]">Full screen</button> : null}</div></div>
                  {localPdf ? <iframe src={event.pdfUrl} sandbox="" loading="lazy" className="h-[26rem] w-full" title={`${event.title} event document`} /> : <p className="p-5 text-sm leading-7 text-[var(--ink)]/75">This approved document opens directly in a new tab.</p>}
                </article>
              ) : null}
              {embedVideos.length > 0 ? (
                <article className="border border-[var(--ink)] bg-[var(--paper)]">
                  <div className="border-b border-[var(--ink)] p-4"><div className="flex items-center gap-2 font-bold text-[var(--midnight)]"><Play className="h-5 w-5 text-[var(--cobalt)]" aria-hidden="true" /> Event video</div></div>
                  <div className="space-y-7 p-4">{embedVideos.map((video, index) => <div key={video.original}><p className="mb-3 text-sm font-semibold text-[var(--cobalt)]">{embedVideos.length > 1 ? `Video ${index + 1}` : 'Presentation recording'}</p><div className="aspect-video overflow-hidden border border-[var(--ink)]"><iframe src={video.embed} loading="lazy" className="h-full w-full" title={`${event.title} video ${index + 1}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></div>)}</div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {galleryActiveImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--midnight)]/95 p-4" role="dialog" aria-modal="true" aria-labelledby="event-image-viewer-title" onClick={() => setGalleryActiveImage(null)}>
          <div ref={galleryDialogRef} className="relative w-full max-w-5xl border-2 border-[var(--cream)] bg-[var(--midnight)] p-3 rounded-[10px]" onClick={(clickEvent) => clickEvent.stopPropagation()}>
            <h2 id="event-image-viewer-title" className="sr-only">Event image viewer</h2>
            <button ref={galleryCloseButtonRef} type="button" onClick={() => setGalleryActiveImage(null)} className="absolute right-4 top-4 z-10 inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--cream)] bg-[var(--midnight)] text-[var(--cream)] rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)]" aria-label="Close image viewer"><X className="h-5 w-5" aria-hidden="true" /></button>
            {galleryImages.length > 1 ? <><button type="button" onClick={() => setGalleryActiveImage(galleryImages[(activeGalleryIndex - 1 + galleryImages.length) % galleryImages.length])} className="absolute left-4 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center border border-[var(--cream)] bg-[var(--midnight)] text-[var(--cream)] rounded-[10px]" aria-label="Previous event image"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button><button type="button" onClick={() => setGalleryActiveImage(galleryImages[(activeGalleryIndex + 1) % galleryImages.length])} className="absolute right-4 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center border border-[var(--cream)] bg-[var(--midnight)] text-[var(--cream)] rounded-[10px]" aria-label="Next event image"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button></> : null}
            <div className="relative aspect-[4/3] max-h-[82vh] w-full"><Image src={galleryActiveImage} alt={resolveEventImageAlt(event, 'gallery', galleryActiveImage, activeGalleryIndex)} fill sizes="100vw" className="object-contain" priority /></div>
          </div>
        </div>
      ) : null}

      {pdfFullscreen && localPdf ? (
        <div className="fixed inset-0 z-50 bg-[var(--midnight)]/95 p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="event-document-viewer-title" onClick={() => setPdfFullscreen(false)}>
          <div ref={pdfDialogRef} className="flex h-full flex-col border-2 border-[var(--cream)] bg-[var(--paper)] rounded-[10px]" onClick={(clickEvent) => clickEvent.stopPropagation()}><div className="flex min-h-14 items-center justify-between border-b border-[var(--ink)] px-4"><h2 id="event-document-viewer-title" className="font-bold text-[var(--midnight)]">{event.title} document</h2><button ref={pdfCloseButtonRef} type="button" onClick={() => setPdfFullscreen(false)} className="inline-flex min-h-11 items-center gap-2 border border-[var(--ink)] px-3 py-2 text-xs font-bold rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]">Close <X className="h-4 w-4" aria-hidden="true" /></button></div><iframe src={event.pdfUrl} sandbox="" loading="lazy" className="min-h-0 flex-1 w-full" title={event.title + ' document full screen'} /></div>
        </div>
      ) : null}
    </main>
  )
}
