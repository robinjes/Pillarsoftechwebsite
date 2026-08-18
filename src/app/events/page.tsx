'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MapPin, Search, UsersRound } from 'lucide-react'
import type { PublicEvent } from '@/lib/content-contracts'

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

function EventRow({ event }: { event: PublicEvent }) {
  const image = localImage(event.image || event.heroImage)
  const eventPath = `/events/${event.slug || event.id}`
  const participantOpen = isCurrentEvent(event) && event.participantRegistrationState === 'open'
  const participantFull = isCurrentEvent(event) && event.participantRegistrationState === 'full'
  const volunteerOpen = isCurrentEvent(event) && event.volunteerRegistrationState === 'open'

  return (
    <article className="grid gap-0 border-t-2 border-[var(--ink)] py-7 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.45fr)_auto] lg:gap-8">
      <div className="grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <Link href={eventPath} className="group block">
          <div className="relative aspect-[4/3] overflow-hidden border border-[var(--ink)] bg-[var(--paper)] rounded-[10px]">
            {image ? (
              <Image
                src={image}
                alt={`${event.title} event photo`}
                fill
                sizes="(max-width: 640px) 100vw, 9rem"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-end p-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--midnight)]">
                STEM program
              </div>
            )}
          </div>
        </Link>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]">
            <span className="border border-[var(--cobalt)] bg-[var(--sky)] px-2 py-1 text-[var(--midnight)] rounded-[10px]">
              {statusLabel(event)}
            </span>
            <span className="text-[var(--cobalt)]">{event.programCategory}</span>
          </div>
          <h3 className="mt-3 font-display text-2xl leading-tight text-[var(--midnight)] sm:text-3xl">
            <Link href={eventPath} className="underline-offset-4 hover:underline focus-visible:underline">
              {event.title}
            </Link>
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink)]/80">{eventStory(event)}</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-[var(--ink)]/30 pt-5 text-sm sm:grid-cols-3 lg:mt-0 lg:block lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
        <div>
          <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--cobalt)]">
            <CalendarDays className="h-4 w-4" aria-hidden="true" /> Date
          </dt>
          <dd className="mt-1 font-semibold">{dateLabel(event)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--cobalt)]">
            <MapPin className="h-4 w-4" aria-hidden="true" /> Location
          </dt>
          <dd className="mt-1 font-semibold">{event.location || 'Location to be announced'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--cobalt)]">Time</dt>
          <dd className="mt-1 font-semibold">{event.time || 'Time to be announced'}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row lg:mt-0 lg:min-w-[11rem] lg:flex-col lg:justify-center">
        <Link
          href={eventPath}
          className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--midnight)] px-4 py-2 text-sm font-bold text-[var(--midnight)] transition-colors hover:bg-[var(--midnight)] hover:text-[var(--cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)] rounded-[10px]"
        >
          Read the story <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {participantOpen ? (
          <Link
            href={`/register/${event.slug || event.id}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--cobalt)] px-4 py-2 text-sm font-bold text-[var(--cream)] transition-colors hover:bg-[var(--midnight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)] rounded-[10px]"
          >
            Participant registration
          </Link>
        ) : participantFull ? (
          <span className="inline-flex min-h-11 items-center justify-center border border-[var(--ink)] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink)]/70 rounded-[10px]">
            Participant list is full
          </span>
        ) : null}
        {volunteerOpen ? (
          <Link
            href={`/volunteer?eventId=${encodeURIComponent(event.slug || event.id)}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--cobalt)] px-4 py-2 text-sm font-bold text-[var(--cobalt)] transition-colors hover:bg-[var(--sky)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)] rounded-[10px]"
          >
            <UsersRound className="h-4 w-4" aria-hidden="true" /> Volunteer
          </Link>
        ) : null}
      </div>
    </article>
  )
}

function EmptySection({ completed, cancelled }: { completed?: boolean; cancelled?: boolean }) {
  return (
    <div className="border-t-2 border-[var(--ink)] py-10">
      <p className="font-display text-2xl text-[var(--midnight)]">
        {cancelled ? 'No cancelled events match this search.' : completed ? 'No completed events match this search.' : 'No upcoming dates are posted yet.'}
      </p>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--ink)]/75">
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
    <main className="min-h-screen bg-[var(--cream)] px-4 pb-20 pt-24 text-[var(--ink)] sm:px-6 lg:px-8">
      <header className="mx-auto max-w-7xl border-b-2 border-[var(--ink)] bg-[var(--midnight)] px-6 py-12 text-[var(--cream)] sm:px-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--sky)]">Pillars of Tech / Field notes</p>
            <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.95] sm:text-7xl">
              Programs that make curiosity visible.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--cream)]/80 sm:text-lg">
              Browse hands-on STEM programs, event stories, and the next places to learn together.
            </p>
          </div>
          <div className="border-l-2 border-[var(--sky)] pl-5 text-sm leading-7 text-[var(--cream)]/80">
            <p className="font-bold uppercase tracking-[0.18em] text-[var(--sky)]">How to use this archive</p>
            <p className="mt-3">Choose a current program to register, or open a completed story for the work that came before it.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b-2 border-[var(--ink)] py-6 md:flex-row md:items-center md:justify-between">
          <label className="relative block min-w-0 md:max-w-md md:flex-1">
            <span className="sr-only">Search programs and events</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cobalt)]" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search the archive"
              className="min-h-11 w-full border-2 border-[var(--ink)] bg-[var(--paper)] px-10 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)] rounded-[10px]"
            />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Filter events">
            {(['all', 'upcoming', 'completed', 'cancelled'] as EventFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={`min-h-11 border-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)] rounded-[10px] ${
                  filter === option
                    ? 'border-[var(--midnight)] bg-[var(--midnight)] text-[var(--cream)]'
                    : 'border-[var(--ink)] bg-transparent text-[var(--ink)] hover:bg-[var(--sky)]'
                }`}
              >
                {option === 'all' ? 'All stories' : option === 'cancelled' ? 'Cancelled' : option}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="border-b-2 border-[var(--ink)] py-20" role="status">
            <p className="font-display text-3xl text-[var(--midnight)]">Loading the program archive…</p>
          </div>
        ) : loadError ? (
          <div className="border-b-2 border-[var(--ink)] py-20" role="alert">
            <p className="font-display text-3xl text-[var(--midnight)]">The archive is temporarily unavailable.</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--ink)]/75">Please try again shortly. No event details were loaded.</p>
          </div>
        ) : (
          <div>
            {filter !== 'completed' && filter !== 'cancelled' && (
              <section aria-labelledby="upcoming-heading" className="pt-12">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Now / next</p>
                    <h2 id="upcoming-heading" className="mt-2 font-display text-4xl text-[var(--midnight)]">Upcoming & ongoing</h2>
                  </div>
                  <span className="hidden text-sm font-semibold text-[var(--ink)]/60 sm:block">{sections.upcoming.length} listed</span>
                </div>
                {sections.upcoming.length > 0 ? sections.upcoming.map((event) => <EventRow key={event.id} event={event} />) : <EmptySection />}
              </section>
            )}

            {filter !== 'upcoming' && filter !== 'cancelled' && (
              <section aria-labelledby="completed-heading" className="pt-14">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Archive / stories</p>
                    <h2 id="completed-heading" className="mt-2 font-display text-4xl text-[var(--midnight)]">Completed programs</h2>
                  </div>
                  <span className="hidden text-sm font-semibold text-[var(--ink)]/60 sm:block">{sections.completed.length} listed</span>
                </div>
                {sections.completed.length > 0 ? sections.completed.map((event) => <EventRow key={event.id} event={event} />) : <EmptySection completed />}
              </section>
            )}

            {filter !== 'upcoming' && filter !== 'completed' && (filter === 'cancelled' || sections.cancelled.length > 0) && (
              <section aria-labelledby="cancelled-heading" className="pt-14">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Archive / changes</p>
                    <h2 id="cancelled-heading" className="mt-2 font-display text-4xl text-[var(--midnight)]">Cancelled programs</h2>
                  </div>
                  <span className="hidden text-sm font-semibold text-[var(--ink)]/60 sm:block">{sections.cancelled.length} listed</span>
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
