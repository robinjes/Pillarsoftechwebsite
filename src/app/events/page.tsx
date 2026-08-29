'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MapPin, Search, UsersRound } from 'lucide-react'
import { publicEventSchema, type BranchCode, type PublicEvent } from '@/lib/content-contracts'
import { resolveEventImageAlt } from '@/lib/event-media'

type EventFilter = 'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
type BranchFilter = 'all' | BranchCode

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
    <article className="grid gap-7 border-t border-[var(--ink)]/35 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,0.42fr)_auto] lg:gap-10">
      <div className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Link href={eventPath} className="group block">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] border border-[var(--ink)] bg-[var(--paper)]">
            {image ? (
              <Image
                src={image}
                alt={resolveEventImageAlt(event, 'image', image)}
                fill
                sizes="(max-width: 640px) 100vw, 12rem"
                className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            ) : (
              <div className="flex h-full items-end p-3 text-sm font-semibold text-[var(--midnight)]">
                STEM program
              </div>
            )}
          </div>
        </Link>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="border border-[var(--cobalt)] bg-[var(--sky)] px-2 py-1 text-[var(--midnight)]">
              {statusLabel(event)}
            </span>
            <span className="text-[var(--cobalt)]">{event.programCategory}</span>
            <span className="rounded-full border border-[var(--ink)]/20 px-2 py-1 text-xs font-semibold text-[var(--ink)]/75">{branchLabel(event.branch)}</span>
          </div>
          <h3 className="mt-3 font-display text-2xl leading-tight text-[var(--midnight)] sm:text-3xl">
            <Link href={eventPath} className="underline-offset-4 hover:underline focus-visible:underline">
              {event.title}
            </Link>
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink)]/80">{eventStory(event)}</p>
        </div>
      </div>

    <dl className="mt-5 grid gap-4 border-t border-[var(--ink)]/30 pt-5 text-sm sm:grid-cols-3 lg:mt-0 lg:block lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
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

      <div className="mt-6 flex flex-col gap-2 sm:flex-row lg:mt-0 lg:min-w-[11rem] lg:flex-col lg:justify-center">
        <Link
          href={eventPath}
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--midnight)] px-4 py-2 text-sm font-bold text-[var(--midnight)] transition-colors hover:bg-[var(--midnight)] hover:text-[var(--cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
        >
          Read the story <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {participantOpen ? (
          <Link
            href={`/register/${event.slug || event.id}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--cobalt)] px-4 py-2 text-sm font-bold text-[var(--cream)] transition-colors hover:bg-[var(--midnight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
          >
            Participant registration
          </Link>
        ) : participantFull ? (
          <span className="inline-flex min-h-11 items-center justify-center border border-[var(--ink)] px-4 py-2 text-center text-sm font-semibold text-[var(--ink)]/70">
            Participant list is full
          </span>
        ) : null}
        {volunteerOpen ? (
          <Link
            href={`/volunteer?eventId=${encodeURIComponent(event.slug || event.id)}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--cobalt)] px-4 py-2 text-sm font-bold text-[var(--cobalt)] transition-colors hover:bg-[var(--sky)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
          >
            <UsersRound className="h-4 w-4" aria-hidden="true" /> Volunteer
          </Link>
        ) : null}
      </div>
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
    <section className="border-b border-[var(--ink)]/25 py-10 sm:py-14" aria-labelledby="featured-program-heading">
      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch lg:gap-10">
        <div className="flex flex-col justify-between border-t border-[var(--ink)] pt-5">
          <div>
            <p className="font-body text-sm font-semibold text-[var(--cobalt)]">{upcoming ? 'Next on the table' : 'From the archive'} · {branchLabel(featureEvent.branch)}</p>
            <h2 id="featured-program-heading" className="mt-4 max-w-xl font-display text-4xl leading-[1.02] tracking-[-0.03em] text-[var(--midnight)] sm:text-5xl">
              {featureEvent.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--ink)]/75">{eventStory(featureEvent)}</p>
          </div>

          <div className="mt-8">
            <dl className="grid gap-4 border-y border-[var(--ink)]/25 py-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-[var(--cobalt)]">Date</dt>
                <dd className="mt-1 font-semibold text-[var(--midnight)]">{dateLabel(featureEvent)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--cobalt)]">Location</dt>
                <dd className="mt-1 font-semibold text-[var(--midnight)]">{featureEvent.location || 'Location to be announced'}</dd>
              </div>
            </dl>
            <Link
              href={eventPath}
              className="mt-6 inline-flex min-h-11 items-center gap-2 bg-[var(--midnight)] px-5 py-3 text-sm font-bold text-[var(--cream)] transition-colors hover:bg-[var(--cobalt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
            >
              {upcoming ? 'See program details' : 'Read the completed story'}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <figure className="relative min-h-[18rem] overflow-hidden border border-[var(--ink)] bg-[var(--sky)] sm:min-h-[24rem] lg:min-h-[30rem]">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover transition-transform duration-700 motion-safe:hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
          />
          <figcaption className="absolute inset-x-0 bottom-0 border-t border-[var(--ink)]/30 bg-[var(--midnight)]/90 px-4 py-3 text-sm font-semibold text-[var(--cream)]">
            {imageIsArchive ? 'From a recent Pillars workshop' : upcoming ? `${upcoming.title} · program image` : 'Completed program · field image'}
          </figcaption>
        </figure>
      </div>
    </section>
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
    <main className="min-h-screen bg-[var(--cream)] px-4 pb-20 text-[var(--ink)] sm:px-6 lg:px-8">
      <header className="mx-auto max-w-7xl rounded-[2rem] border-b border-[var(--ink)]/25 bg-[var(--midnight)] px-6 py-10 text-[var(--cream)] sm:px-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-[var(--sky)]">Pillars of Tech · field notes</p>
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
        <div className="flex flex-col gap-4 border-b border-[var(--ink)]/30 py-6 md:flex-row md:items-center md:justify-between">
          <label className="relative block min-w-0 md:max-w-md md:flex-1">
            <span className="sr-only">Search programs and events</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--cobalt)]" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search the archive"
              className="min-h-11 w-full border border-[var(--ink)] bg-[var(--paper)] px-10 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
            />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Filter events">
            {(['all', 'upcoming', 'ongoing', 'completed', 'cancelled'] as EventFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={`min-h-11 border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)] ${
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
            <FeaturedProgram upcoming={sections.upcoming[0] || null} archive={sections.completed[0] || null} />
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
                {sections.upcoming.length > 0
                  ? sections.upcoming.map((event) => <EventRow key={event.id} event={event} />)
                  : <EmptySection status={filter === 'upcoming' || filter === 'ongoing' ? filter : undefined} />}
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
                {sections.completed.length > 0 ? sections.completed.map((event) => <EventRow key={event.id} event={event} />) : <EmptySection completed />}
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
                {sections.cancelled.length > 0 ? sections.cancelled.map((event) => <EventRow key={event.id} event={event} />) : <EmptySection cancelled />}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
