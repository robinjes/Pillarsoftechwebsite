'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MapPin, Search, UsersRound } from 'lucide-react'
import type { PublicEvent } from '@/lib/content-contracts'
import { resolveEventImageAlt } from '@/lib/event-media'

type EventFilter = 'all' | 'upcoming' | 'completed' | 'cancelled'

function isCurrentEvent(event: PublicEvent): boolean {
  return event.status === 'upcoming' || event.status === 'ongoing'
}

function splitEventSections(events: PublicEvent[]): {
  upcoming: PublicEvent[]
  completed: PublicEvent[]
  cancelled: PublicEvent[]
} {
  const upcoming = events.filter(isCurrentEvent).sort(compareUpcoming)
  const completed = events
    .filter((event) => event.status === 'completed')
    .sort((a, b) => compareUpcoming(b, a))
  const cancelled = events
    .filter((event) => event.status === 'cancelled')
    .sort((a, b) => compareUpcoming(b, a))

  return { upcoming, completed, cancelled }
}

function parseDate(event: PublicEvent): number {
  const value = event.startsAt || event.date || ''
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function compareUpcoming(a: PublicEvent, b: PublicEvent): number {
  const aDate = parseDate(a)
  const bDate = parseDate(b)
  if (!aDate && !bDate) return a.title.localeCompare(b.title)
  if (!aDate) return 1
  if (!bDate) return -1
  return aDate - bDate
}

function localImage(value?: string): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  if (value.includes('..') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return null
  return value
}

function eventStory(event: PublicEvent): string {
  return event.summary || event.description.split('\n\n')[0] || 'A hands-on STEM experience from Pillars of Tech.'
}

function statusLabel(event: PublicEvent): string {
  if (event.status === 'ongoing') return 'In progress'
  if (event.status === 'cancelled') return 'Cancelled'
  if (event.status === 'completed') return 'Completed'
  return 'Upcoming'
}

function dateLabel(event: PublicEvent): string {
  return event.date || event.startLabel || 'Date to be announced'
}

function eventImage(event: PublicEvent | null | undefined): string | null {
  return localImage(event?.image || event?.heroImage)
}

function EventRow({ event }: { event: PublicEvent }) {
  const image = eventImage(event)
  const eventPath = `/events/${event.slug || event.id}`
  const participantOpen = isCurrentEvent(event) && event.participantRegistrationState === 'open'
  const participantFull = isCurrentEvent(event) && event.participantRegistrationState === 'full'
  const volunteerOpen = isCurrentEvent(event) && event.volunteerRegistrationState === 'open'

  return (
    <article className="signal-event-row">
      <p className="signal-mono signal-event-row__index" aria-hidden="true">/{event.id.slice(0, 2).toUpperCase()}</p>
      <Link href={eventPath} className="signal-event-row__image group block">
        {image ? (
          <Image
            src={image}
            alt={resolveEventImageAlt(event, 'image', image)}
            fill
            sizes="(max-width: 640px) 100vw, 13rem"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-end p-3 text-sm font-semibold text-[var(--carbon)]">STEM program</div>
        )}
        <span className="signal-event-row__image-note">{statusLabel(event)} / {event.programCategory}</span>
      </Link>

      <div className="signal-event-row__body">
        <p className="signal-mono signal-event-row__label">{statusLabel(event)} / {event.programCategory}</p>
        <h3>
          <Link href={eventPath} className="underline-offset-4 hover:text-[var(--ultramarine)] hover:underline focus-visible:underline">
            {event.title}
          </Link>
        </h3>
        <div className="signal-event-row__meta">
          <span><CalendarDays aria-hidden="true" /> {dateLabel(event)}</span>
          <span><MapPin aria-hidden="true" /> {event.location || 'Location to be announced'}</span>
          <span>{event.time || 'Time to be announced'}</span>
        </div>
        <p className="signal-event-row__summary">{eventStory(event)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {participantOpen ? (
            <Link href={`/register/${event.slug || event.id}`} className="signal-button signal-button--orange">
              Participant registration
            </Link>
          ) : participantFull ? (
            <span className="inline-flex min-h-11 items-center border border-[var(--carbon)] px-3 py-2 text-xs font-semibold text-[var(--carbon)]/70">Participant list is full</span>
          ) : null}
          {volunteerOpen ? (
            <Link href={`/volunteer?eventId=${encodeURIComponent(event.slug || event.id)}`} className="signal-button signal-button--line">
              <UsersRound aria-hidden="true" /> Volunteer
            </Link>
          ) : null}
        </div>
      </div>

      <Link href={eventPath} className="signal-event-row__link" aria-label={`Read the story: ${event.title}`}>
        <ArrowUpRight aria-hidden="true" />
      </Link>
    </article>
  )
}

function FeaturedProgram({ upcoming, archive }: { upcoming: PublicEvent | null; archive: PublicEvent | null }) {
  const directImage = eventImage(upcoming)
  const archiveImage = eventImage(archive)
  const featureEvent = upcoming || archive
  if (!featureEvent) return null

  const image = directImage || archiveImage || '/images/events/family-science-night/IMG_8332.JPG'
  const imageSourceEvent = directImage ? upcoming : archive
  const imageIsArchive = Boolean(upcoming && !directImage)
  const eventPath = `/events/${featureEvent.slug || featureEvent.id}`
  const imageAlt = imageSourceEvent
    ? resolveEventImageAlt(imageSourceEvent, 'hero', image)
    : 'A Pillars of Tech volunteer and participant operate a VEX robot during Family Science Night.'

  return (
    <section className="border-b border-[var(--carbon)]/30 py-12 sm:py-16" aria-labelledby="featured-program-heading">
      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch lg:gap-10">
        <div className="flex flex-col justify-between border-t border-[var(--carbon)] pt-5">
          <div>
            <p className="signal-mono signal-eyebrow">{upcoming ? 'NEXT ON THE TABLE' : 'FROM THE ARCHIVE'}</p>
            <h2 id="featured-program-heading" className="mt-4 max-w-xl font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--carbon)] sm:text-5xl">
              {featureEvent.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--carbon)]/70">{eventStory(featureEvent)}</p>
          </div>

          <div className="mt-8">
            <dl className="grid gap-4 border-y border-[var(--carbon)]/25 py-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="signal-mono text-[var(--ultramarine)]">DATE</dt>
                <dd className="mt-1 font-semibold text-[var(--carbon)]">{dateLabel(featureEvent)}</dd>
              </div>
              <div>
                <dt className="signal-mono text-[var(--ultramarine)]">LOCATION</dt>
                <dd className="mt-1 font-semibold text-[var(--carbon)]">{featureEvent.location || 'Location to be announced'}</dd>
              </div>
            </dl>
            <Link
              href={eventPath}
              className="signal-button signal-button--orange mt-6"
            >
              {upcoming ? 'See program details' : 'Read the completed story'}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <figure className="relative min-h-[18rem] overflow-hidden border border-[var(--carbon)] bg-[var(--mist)] shadow-[0.65rem_0.65rem_0_var(--signal-orange)] sm:min-h-[24rem] lg:min-h-[30rem]">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover transition-transform duration-700 motion-safe:hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
          />
          <figcaption className="absolute inset-x-0 bottom-0 border-t border-[var(--off-white)]/30 bg-[var(--carbon)]/90 px-4 py-3 text-sm font-semibold text-[var(--off-white)]">
            {imageIsArchive ? 'From a recent Pillars workshop' : upcoming ? `${upcoming.title} · program image` : 'Completed program · field image'}
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function EmptySection({ completed, cancelled }: { completed?: boolean; cancelled?: boolean }) {
  return (
    <div className="signal-empty">
      <p className="font-display text-2xl text-[var(--carbon)]">
        {cancelled ? 'No cancelled events match this search.' : completed ? 'No completed events match this search.' : 'No upcoming dates are posted yet.'}
      </p>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--carbon)]/68">
        {cancelled
          ? 'Cancelled programs stay separate from the completed archive.'
          : completed
          ? 'Try a different phrase or return to the full archive.'
          : 'We are planning the next program. Check back here for a confirmed date—there is no placeholder date to sign up for.'}
      </p>
    </div>
  )
}

export default function EventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<EventFilter>('all')

  useEffect(() => {
    let mounted = true
    fetch('/api/events')
      .then(async (response) => {
        if (!response.ok) throw new Error('Events unavailable')
        const data: unknown = await response.json()
        if (!Array.isArray(data)) throw new Error('Invalid events response')
        return data as PublicEvent[]
      })
      .then((data) => {
        if (!mounted) return
        setEvents(data)
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
  }, [])

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return events.filter((event) => {
      if (filter === 'upcoming' && !isCurrentEvent(event)) return false
      if (filter === 'completed' && event.status !== 'completed') return false
      if (filter === 'cancelled' && event.status !== 'cancelled') return false
      if (!query) return true
      return [event.title, event.description, event.location, event.programCategory]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [events, filter, searchQuery])

  const sections = splitEventSections(filteredEvents)

  return (
    <main className="min-h-screen bg-[var(--bone)] pb-20 text-[var(--carbon)] selection:bg-[var(--cream)]">
      <header className="border-b border-[var(--ink)]/30 bg-[var(--carbon)] py-14 text-[var(--off-white)] sm:py-20">
        <div className="signal-shell grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="signal-mono signal-eyebrow">EVENTS / TRANSMISSION ARCHIVE</p>
            <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.94] tracking-[-0.05em] sm:text-[4.35rem]">
              Programs that make curiosity visible.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--off-white)]/72 sm:text-lg sm:leading-8">
              Browse hands-on STEM programs, event stories, and the next places to learn together.
            </p>
          </div>
          <div className="border-l border-[var(--signal-orange)] pl-5 text-sm leading-7 text-[var(--off-white)]/72">
            <p className="signal-mono text-[var(--signal-orange)]">HOW TO USE THIS ARCHIVE</p>
            <p className="mt-3">Choose a current program to register, or open a completed story for the work that came before it.</p>
          </div>
        </div>
      </header>

      <div className="signal-shell">
        <div className="flex flex-col gap-4 border-b border-[var(--carbon)]/30 py-6 md:flex-row md:items-center md:justify-between">
          <label className="relative block min-w-0 md:max-w-md md:flex-1">
            <span className="sr-only">Search programs and events</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ultramarine)]" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search the archive"
              className="min-h-11 w-full border border-[var(--carbon)] bg-[var(--off-white)] px-10 py-2 text-sm text-[var(--carbon)] placeholder:text-[var(--carbon)]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ultramarine)]"
            />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Filter events">
            {(['all', 'upcoming', 'completed', 'cancelled'] as EventFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={`min-h-11 border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ultramarine)] ${
                  filter === option
                    ? 'border-[var(--carbon)] bg-[var(--carbon)] text-[var(--off-white)]'
                    : 'border-[var(--carbon)] bg-transparent text-[var(--carbon)] hover:bg-[var(--mist)]'
                }`}
              >
                {option === 'all' ? 'All stories' : option === 'cancelled' ? 'Cancelled' : option}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="border-b border-[var(--carbon)]/30 py-16" role="status">
            <p className="font-display text-3xl text-[var(--carbon)]">Loading the program archive…</p>
          </div>
        ) : loadError ? (
          <div className="border-b border-[var(--carbon)]/30 py-16" role="alert">
            <p className="font-display text-3xl text-[var(--carbon)]">The archive is temporarily unavailable.</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--carbon)]/68">Please try again shortly. No event details were loaded.</p>
          </div>
        ) : (
          <div>
            <FeaturedProgram upcoming={sections.upcoming[0] || null} archive={sections.completed[0] || null} />
            {filter !== 'completed' && filter !== 'cancelled' && (
              <section aria-labelledby="upcoming-heading" className="pt-12">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="signal-mono signal-eyebrow">NOW / NEXT</p>
                    <h2 id="upcoming-heading" className="mt-2 font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--carbon)]">Upcoming & ongoing</h2>
                  </div>
                  <span className="hidden signal-mono text-[var(--carbon)]/60 sm:block">{sections.upcoming.length} listed</span>
                </div>
                {sections.upcoming.length > 0 ? sections.upcoming.map((event) => <EventRow key={event.id} event={event} />) : <EmptySection />}
              </section>
            )}

            {filter !== 'upcoming' && filter !== 'cancelled' && (
              <section aria-labelledby="completed-heading" className="pt-14">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="signal-mono signal-eyebrow">ARCHIVE / STORIES</p>
                    <h2 id="completed-heading" className="mt-2 font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--carbon)]">Completed programs</h2>
                  </div>
                  <span className="hidden signal-mono text-[var(--carbon)]/60 sm:block">{sections.completed.length} listed</span>
                </div>
                {sections.completed.length > 0 ? sections.completed.map((event) => <EventRow key={event.id} event={event} />) : <EmptySection completed />}
              </section>
            )}

            {filter !== 'upcoming' && filter !== 'completed' && (filter === 'cancelled' || sections.cancelled.length > 0) && (
              <section aria-labelledby="cancelled-heading" className="pt-14">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="signal-mono signal-eyebrow">ARCHIVE / CHANGES</p>
                    <h2 id="cancelled-heading" className="mt-2 font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--carbon)]">Cancelled programs</h2>
                  </div>
                  <span className="hidden signal-mono text-[var(--carbon)]/60 sm:block">{sections.cancelled.length} listed</span>
                </div>
                {sections.cancelled.length > 0 ? sections.cancelled.map((event) => <EventRow key={event.id} event={event} />) : <EmptySection cancelled />}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
