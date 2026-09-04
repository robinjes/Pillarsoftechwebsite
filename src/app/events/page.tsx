'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MapPin, Search, UsersRound } from 'lucide-react'
import { publicEventSchema, type BranchCode, type PublicEvent } from '@/lib/content-contracts'
import { resolveEventImageAlt } from '@/lib/event-media'

type EventFilter = 'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
type BranchFilter = 'all' | BranchCode

const archiveImageFallback = '/images/events/family-science-night/IMG_8332.JPG'
const archiveImageFallbackAlt = 'A Pillars of Tech volunteer and participant operate a VEX robot during Family Science Night.'

function branchLabel(branch: BranchCode | undefined): string {
  if (branch === 'ca') return 'California'
  if (branch === 'ga') return 'Georgia'
  // This defensive fallback is unreachable after the public Zod parse. It is
  // intentionally neutral rather than guessing from title/location text.
  return 'Branch not listed'
}

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
  if (event.status === 'ongoing') return 'In Progress'
  if (event.status === 'cancelled') return 'Cancelled'
  if (event.status === 'completed') return 'Completed'
  return 'Upcoming'
}

function programCategoryLabel(value: string): string {
  return value
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\p{L}/gu, (character) => character.toUpperCase())
}

function dateLabel(event: PublicEvent): string {
  return event.date || event.startLabel || 'Date to be announced'
}

function eventImage(event: PublicEvent | null | undefined): string | null {
  return localImage(event?.image || event?.heroImage)
}

function EventCard({ event }: { event: PublicEvent }) {
  const sourceImage = eventImage(event)
  const image = sourceImage || archiveImageFallback
  const imageAlt = sourceImage ? resolveEventImageAlt(event, 'image', image) : archiveImageFallbackAlt
  const eventPath = `/events/${event.slug || event.id}`
  const participantOpen = isCurrentEvent(event) && event.participantRegistrationState === 'open'
  const participantFull = isCurrentEvent(event) && event.participantRegistrationState === 'full'
  const volunteerOpen = isCurrentEvent(event) && event.volunteerRegistrationState === 'open'

  return (
    <article data-event-card={event.id} className="flex h-full flex-col overflow-hidden rounded-[2rem] border-2 border-[var(--ink)]/35 bg-[var(--paper)]">
      <Link href={eventPath} className="group block">
        <div className="relative aspect-video overflow-hidden bg-[var(--sky)]">
          {image ? (
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="flex h-full items-end p-4 text-sm font-semibold text-[var(--midnight)]">
              STEM program
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <span className="rounded-full border-2 border-[var(--cobalt)] bg-[var(--sky)] px-3 py-1 text-[var(--midnight)]">
            {statusLabel(event)}
          </span>
          <span className="text-[var(--cobalt)]">{programCategoryLabel(event.programCategory)}</span>
          <span className="rounded-full border-2 border-[var(--ink)]/20 px-3 py-1 text-xs font-semibold text-[var(--ink)]/75">{branchLabel(event.branch)}</span>
        </div>
        <h3 className="mt-3 font-display text-xl leading-tight text-[var(--midnight)] sm:text-2xl">
          <Link href={eventPath} className="underline-offset-4 hover:underline focus-visible:underline">
            {event.title}
          </Link>
        </h3>
        <p className="mt-2 max-w-2xl line-clamp-3 text-sm leading-6 text-[var(--ink)]/80">{eventStory(event)}</p>

        <dl className="mt-4 grid gap-3 border-t border-[var(--ink)]/30 pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="flex items-center gap-2 text-sm font-semibold text-[var(--cobalt)]">
              <CalendarDays className="h-4 w-4" aria-hidden="true" /> Date
            </dt>
            <dd className="mt-1 font-semibold">{dateLabel(event)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-semibold text-[var(--cobalt)]">
              <MapPin className="h-4 w-4" aria-hidden="true" /> Location
            </dt>
            <dd className="mt-1 font-semibold">{event.location || 'Location to be announced'}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-[var(--cobalt)]">Time</dt>
            <dd className="mt-1 font-semibold">{event.time || 'Time to be announced'}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-col gap-2 pt-4">
        <Link
          href={eventPath}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[var(--midnight)] px-4 py-2 text-sm font-bold text-[var(--midnight)] transition-colors hover:bg-[var(--midnight)] hover:text-[var(--cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
        >
          Read The Story <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {participantOpen ? (
          <Link
            href={`/register/${event.slug || event.id}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[var(--cobalt)] bg-[var(--cobalt)] px-4 py-2 text-sm font-bold text-[var(--cream)] transition-colors hover:bg-[var(--midnight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
          >
            Participant Registration
          </Link>
        ) : participantFull ? (
          <span className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-[var(--ink)] px-4 py-2 text-center text-sm font-semibold text-[var(--ink)]/70">
            Participant List Is Full
          </span>
        ) : null}
        {volunteerOpen ? (
          <Link
            href={`/volunteer?eventId=${encodeURIComponent(event.slug || event.id)}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[var(--cobalt)] px-4 py-2 text-sm font-bold text-[var(--cobalt)] transition-colors hover:bg-[var(--sky)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
          >
            <UsersRound className="h-4 w-4" aria-hidden="true" /> Volunteer
          </Link>
        ) : null}
      </div>
      </div>
    </article>
  )
}

function EmptySection({ status, completed, cancelled }: { status?: 'upcoming' | 'ongoing'; completed?: boolean; cancelled?: boolean }) {
  return (
    <div className="border-t border-[var(--ink)]/35 py-10">
      <p className="font-display text-2xl text-[var(--midnight)]">
        {cancelled
          ? 'No cancelled events match this search.'
          : completed
          ? 'No completed events match this search.'
          : status === 'ongoing'
          ? 'No ongoing events match this search.'
          : status === 'upcoming'
          ? 'No upcoming events match this search.'
          : 'No upcoming dates are posted yet.'}
      </p>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--ink)]/75">
        {cancelled
          ? 'Cancelled programs stay separate from the completed archive.'
          : completed
          ? 'Try a different phrase or return to the full archive.'
          : status === 'ongoing'
          ? 'There are no ongoing programs matching this search right now.'
          : status === 'upcoming'
          ? 'There are no upcoming programs matching this search right now.'
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
  const [branchFilter, setBranchFilter] = useState<BranchFilter>('all')

  useEffect(() => {
    let mounted = true
    fetch('/api/events')
      .then(async (response) => {
        if (!response.ok) throw new Error('Events unavailable')
        const data: unknown = await response.json()
        if (!Array.isArray(data)) throw new Error('Invalid events response')
        const parsed = publicEventSchema.array().safeParse(data)
        if (!parsed.success) throw new Error('Invalid events response')
        return parsed.data
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
      if (filter === 'upcoming' && event.status !== 'upcoming') return false
      if (filter === 'ongoing' && event.status !== 'ongoing') return false
      if (filter === 'completed' && event.status !== 'completed') return false
      if (filter === 'cancelled' && event.status !== 'cancelled') return false
      if (branchFilter !== 'all' && event.branch !== branchFilter) return false
      if (!query) return true
      return [event.title, event.description, event.location, event.programCategory]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [branchFilter, events, filter, searchQuery])

  const sections = splitEventSections(filteredEvents)

  return (
    <main className="min-h-screen bg-[var(--cream)] px-4 pb-20 pt-6 text-[var(--ink)] sm:px-6 lg:px-8 lg:pt-8">
      <header className="mx-auto max-w-7xl rounded-[2rem] border-b border-[var(--ink)]/25 bg-[var(--midnight)] px-6 py-10 text-[var(--cream)] sm:px-10 sm:py-14">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] xl:items-end">
          <div>
            <p className="text-sm font-semibold text-[var(--sky)]">Pillars of Tech · Event Archive</p>
            <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.96] tracking-[-0.04em] sm:text-[4.35rem]">
              Programs that make curiosity visible.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--cream)]/80 sm:text-lg sm:leading-8">
              Browse hands-on STEM programs, event stories, and the next places to learn together.
            </p>
          </div>
          <div className="border-l border-[var(--sky)]/60 pl-5 text-sm leading-7 text-[var(--cream)]/80">
            <p className="font-semibold text-[var(--sky)]">How to use this archive</p>
            <p className="mt-3">Choose a current program to register, or open a completed story for the work that came before it.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-[var(--ink)]/30 py-6 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative block min-w-0 xl:max-w-md xl:flex-1">
            <span className="sr-only">Search programs and events</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cobalt)]" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search the archive"
              className="min-h-11 w-full rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-10 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
            />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Filter events">
            {(['all', 'upcoming', 'ongoing', 'completed', 'cancelled'] as EventFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={`min-h-11 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)] ${
                  filter === option
                    ? 'border-[var(--midnight)] bg-[var(--midnight)] text-[var(--cream)]'
                    : 'border-[var(--ink)] bg-transparent text-[var(--ink)] hover:bg-[var(--sky)]'
                }`}
              >
                {option === 'all' ? 'All stories' : option === 'ongoing' ? 'Ongoing' : option === 'cancelled' ? 'Cancelled' : option === 'upcoming' ? 'Upcoming' : 'Completed'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter events by branch">
            {(['all', 'ca', 'ga'] as BranchFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={branchFilter === option}
                onClick={() => setBranchFilter(option)}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)] ${
                  branchFilter === option
                    ? 'border-[var(--cobalt)] bg-[var(--sky)] text-[var(--midnight)]'
                    : 'border-[var(--ink)] bg-transparent text-[var(--ink)] hover:bg-[var(--sky)]'
                }`}
              >
                {option === 'all' ? 'All branches' : branchLabel(option)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="border-b border-[var(--ink)]/30 py-16" role="status">
            <p className="font-display text-3xl text-[var(--midnight)]">Loading the program archive…</p>
          </div>
        ) : loadError ? (
          <div className="border-b border-[var(--ink)]/30 py-16" role="alert">
            <p className="font-display text-3xl text-[var(--midnight)]">The archive is temporarily unavailable.</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--ink)]/75">Please try again shortly. No event details were loaded.</p>
          </div>
        ) : (
          <div>
            {filter !== 'completed' && filter !== 'cancelled' && (
              <section aria-labelledby="upcoming-heading" className="pt-12">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--cobalt)]">{filter === 'ongoing' ? 'Now' : 'Now / next'}</p>
                    <h2 id="upcoming-heading" className="mt-2 font-display text-4xl leading-[1.02] tracking-[-0.03em] text-[var(--midnight)]">
                      {filter === 'upcoming' ? 'Upcoming programs' : filter === 'ongoing' ? 'Ongoing programs' : 'Upcoming & ongoing'}
                    </h2>
                  </div>
                  <span className="hidden text-sm font-semibold text-[var(--ink)]/60 sm:block">{sections.upcoming.length} listed</span>
                </div>
                {sections.upcoming.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {sections.upcoming.map((event) => <EventCard key={event.id} event={event} />)}
                  </div>
                ) : <EmptySection status={filter === 'upcoming' || filter === 'ongoing' ? filter : undefined} />}
              </section>
            )}

            {filter !== 'upcoming' && filter !== 'ongoing' && filter !== 'cancelled' && (
              <section aria-labelledby="completed-heading" className="pt-14">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--cobalt)]">Archive / stories</p>
                    <h2 id="completed-heading" className="mt-2 font-display text-4xl leading-[1.02] tracking-[-0.03em] text-[var(--midnight)]">Completed programs</h2>
                  </div>
                  <span className="hidden text-sm font-semibold text-[var(--ink)]/60 sm:block">{sections.completed.length} listed</span>
                </div>
                {sections.completed.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {sections.completed.map((event) => <EventCard key={event.id} event={event} />)}
                  </div>
                ) : <EmptySection completed />}
              </section>
            )}

            {filter !== 'upcoming' && filter !== 'ongoing' && filter !== 'completed' && (filter === 'cancelled' || sections.cancelled.length > 0) && (
              <section aria-labelledby="cancelled-heading" className="pt-14">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--cobalt)]">Archive / changes</p>
                    <h2 id="cancelled-heading" className="mt-2 font-display text-4xl leading-[1.02] tracking-[-0.03em] text-[var(--midnight)]">Cancelled programs</h2>
                  </div>
                  <span className="hidden text-sm font-semibold text-[var(--ink)]/60 sm:block">{sections.cancelled.length} listed</span>
                </div>
                {sections.cancelled.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {sections.cancelled.map((event) => <EventCard key={event.id} event={event} />)}
                  </div>
                ) : <EmptySection cancelled />}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
