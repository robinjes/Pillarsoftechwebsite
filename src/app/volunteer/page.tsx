'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Event } from '@/data/events'
import { volunteerService, type VolunteerProfile, type VolunteerSignup } from '@/lib/volunteerService'
import { LocalMemberQr } from '@/components/LocalMemberQr'
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Loader2,
  LogOut,
  MapPin,
  QrCode,
  ShieldCheck,
  User,
  Users,
  Wrench,
} from 'lucide-react'

const teamJoinUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdsNmpS2wpikV77wl1ifpD52a0zAepa-b8DhesqFjPTQVoo7w/viewform?usp=header'

const volunteerDescriptions: Record<string, string> = {
  'career-panel-granada': 'Help with check-in, directions, and the small details that keep a panel moving.',
}

const getVolunteerDescription = (event: Event) => volunteerDescriptions[event.id] ?? `Help with setup, greeting attendees, activity support, and the practical work around ${event.title}.`

const isCurrentVolunteerEvent = (event: Event) => event.status === 'upcoming' || event.status === 'ongoing'

function getScrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'smooth'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

function EventDetails({ event }: { event: Event }) {
  return (
    <details className="group border-t border-[var(--ink)]/20 pt-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-body text-sm font-bold text-[var(--cobalt)] outline-none transition hover:text-[var(--midnight)] focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span>View event details</span>
        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-open:translate-x-1" />
      </summary>
      <div className="space-y-3 pb-2 pt-4 font-body text-sm leading-6 text-[var(--ink)]/70">
        <p className="flex items-start gap-3"><Calendar aria-hidden="true" className="mt-1 h-4 w-4 flex-none text-[var(--cobalt)]" /><span><strong className="text-[var(--midnight)]">Date:</strong> {event.date || 'Details coming soon'}</span></p>
        <p className="flex items-start gap-3"><Clock aria-hidden="true" className="mt-1 h-4 w-4 flex-none text-[var(--cobalt)]" /><span><strong className="text-[var(--midnight)]">Time:</strong> {event.time || 'Details coming soon'}</span></p>
        <p className="flex items-start gap-3"><MapPin aria-hidden="true" className="mt-1 h-4 w-4 flex-none text-[var(--cobalt)]" /><span><strong className="text-[var(--midnight)]">Location:</strong> {event.location || 'Details coming soon'}</span></p>
        {event.description && <p className="border-t border-[var(--ink)]/15 pt-3">{event.description}</p>}
      </div>
    </details>
  )
}

function RegistrationState({ state }: { state: Event['volunteerRegistrationState'] }) {
  if (state === 'open') return <span className="font-body text-xs font-bold uppercase tracking-[0.16em] text-[var(--cobalt)]">Registration open</span>
  if (state === 'full') return <span className="font-body text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">Volunteer roster full</span>
  return <span className="font-body text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">Registration closed</span>
}

export default function VolunteerPortalPage() {
  const router = useRouter()
  const [user, setUser] = useState<VolunteerProfile | null>(null)
  const [signups, setSignups] = useState<VolunteerSignup[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [pageError, setPageError] = useState('')
  const [deepLinkedEventId, setDeepLinkedEventId] = useState<string | null>(null)
  const [signingUpEventId, setSigningUpEventId] = useState<string | null>(null)
  const [cancellingEventId, setCancellingEventId] = useState<string | null>(null)

  const formRef = useRef<HTMLElement>(null)
  const eventRefs = useRef<Record<string, HTMLElement | null>>({})
  const deepLinkHandledRef = useRef(false)
  const authOpenerRef = useRef<HTMLButtonElement | null>(null)
  const authCloseRef = useRef<HTMLButtonElement | null>(null)
  const authDialogRef = useRef<HTMLDivElement | null>(null)

  const loadVolunteerSession = async () => {
    const profile = await volunteerService.getCurrentUser()
    if (profile?.role === 'staff') {
      router.replace('/volunteer/checkin')
      return profile
    }
    if (profile) {
      setUser(profile)
      setSignups(await volunteerService.getMySignups())
      return profile
    }
    setUser(null)
    setSignups([])
    return null
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (new URLSearchParams(window.location.search).get('error') === 'auth') {
        setAuthError('Google sign-in failed. Please try again.')
      }

      try {
        await loadVolunteerSession()
      } catch {
        if (mounted) setPageError('Volunteer information is temporarily unavailable. Please try again.')
      }

      try {
        const response = await fetch('/api/events', { cache: 'no-store' })
        const data: unknown = await response.json()
        if (!response.ok || !Array.isArray(data)) throw new Error('Events unavailable')
        if (mounted) {
          const nextEvents = data as Event[]
          const requestedEventId = new URLSearchParams(window.location.search).get('eventId')
          const matchedEvent = requestedEventId
            ? nextEvents.find((event) => event.id === requestedEventId || event.slug === requestedEventId)
            : undefined
          setEvents(nextEvents)
          setDeepLinkedEventId(matchedEvent && isCurrentVolunteerEvent(matchedEvent) ? matchedEvent.id : null)
        }
      } catch {
        if (mounted) setPageError((current) => current || 'Upcoming volunteer events are temporarily unavailable.')
      }

      if (mounted) setLoading(false)
    }

    void init()

    const unsubscribe = volunteerService.onAuthStateChange(() => {
      if (!mounted) return
      void loadVolunteerSession().catch(() => {
        if (mounted) setPageError('Your volunteer session could not be refreshed. Please try again.')
      })
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  // loadVolunteerSession intentionally follows the current auth session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    if (isAuthModalOpen) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const focusTimer = window.setTimeout(() => authCloseRef.current?.focus(), 0)

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          setIsAuthModalOpen(false)
          return
        }
        if (event.key !== 'Tab') return

        const dialog = authDialogRef.current
        if (!dialog) return
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        if (focusable.length === 0) {
          event.preventDefault()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => {
        window.clearTimeout(focusTimer)
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = previousOverflow
      }
    }

    authOpenerRef.current?.focus()
    return undefined
  }, [isAuthModalOpen])

  useEffect(() => {
    if (!deepLinkedEventId || deepLinkHandledRef.current) return
    const target = eventRefs.current[deepLinkedEventId]
    if (!target) return

    target.scrollIntoView({ behavior: getScrollBehavior(), block: 'center' })
    target.focus({ preventScroll: true })
    deepLinkHandledRef.current = true
  }, [deepLinkedEventId, loading, user])

  const currentVolunteerEvents = events.filter(isCurrentVolunteerEvent)
  const totalHours = user?.totalHours ?? signups.filter((signup) => signup.status === 'attended').reduce((sum, signup) => sum + signup.hours, 0)
  const badge = totalHours >= 30
    ? { name: 'Gold Champion', className: 'border-amber-700 bg-amber-100 text-amber-950' }
    : totalHours >= 10
      ? { name: 'Silver Leader', className: 'border-slate-500 bg-slate-100 text-slate-900' }
      : { name: 'Bronze Helper', className: 'border-orange-700 bg-orange-100 text-orange-950' }

  const openAuthModal = (event: MouseEvent<HTMLButtonElement>) => {
    authOpenerRef.current = event.currentTarget
    setAuthError('')
    setIsAuthModalOpen(true)
  }

  const handleGoogleSSO = async () => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const signInDestination = deepLinkedEventId
        ? `/volunteer?eventId=${encodeURIComponent(deepLinkedEventId)}`
        : '/volunteer'
      await volunteerService.signInWithGoogle(signInDestination)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign-in could not be started.')
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await volunteerService.signOut()
      setUser(null)
      setSignups([])
    } catch {
      setPageError('We could not sign you out. Please try again.')
    }
  }

  const handleRegisterForEvent = async (event: Event) => {
    if (!user || event.volunteerRegistrationState !== 'open') return
    setSigningUpEventId(event.id)
    setPageError('')
    try {
      const newSignup = await volunteerService.registerForEvent(event.id)
      setSignups((previous) => [...previous.filter((signup) => signup.eventId !== event.id), newSignup])
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Registration could not be completed.')
    } finally {
      setSigningUpEventId(null)
    }
  }

  const handleCancelForEvent = async (eventId: string) => {
    setCancellingEventId(eventId)
    setPageError('')
    try {
      await volunteerService.withdrawFromEvent(eventId)
      setSignups((previous) => previous.filter((signup) => signup.eventId !== eventId))
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Registration could not be cancelled.')
    } finally {
      setCancellingEventId(null)
    }
  }

  const scrollToSignup = () => formRef.current?.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' })

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-5 pt-16 text-[var(--ink)]">
        <div className="flex max-w-md flex-col items-center text-center">
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-[var(--cobalt)] motion-reduce:animate-none" />
          <p className="mt-4 font-body text-sm text-[var(--ink)]/70">Loading the volunteer portal…</p>
        </div>
      </main>
    )
  }

  if (user) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] pt-16 text-[var(--ink)]">
        <header className="border-b-2 border-[var(--ink)]/20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-24">
            <div>
              <p className="mb-5 font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Volunteer portal / Dashboard</p>
              <h1 className="max-w-4xl font-display text-5xl leading-[0.96] tracking-tight text-[var(--midnight)] sm:text-7xl">Welcome back, {user.fullName}.</h1>
              <p className="mt-5 font-body text-base leading-7 text-[var(--ink)]/65">Manage your event registrations, member code, and volunteer history.</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start border-2 border-[var(--ink)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)] lg:self-auto"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
          {pageError && <div role="alert" className="mb-8 border-l-4 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950">{pageError}</div>}

          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-8">
              <section className="border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
                  <div className="flex items-start gap-4">
                    <User aria-hidden="true" className="mt-1 h-6 w-6 text-[var(--cobalt)]" />
                    <div>
                      <h2 className="font-display text-2xl leading-tight text-[var(--midnight)]">Your member record</h2>
                      <p className="mt-1 break-all font-body text-xs text-[var(--ink)]/60">{user.email}</p>
                    </div>
                  </div>
                  {user.role === 'staff' && <ShieldCheck aria-label="Verified staff" className="h-6 w-6 text-[var(--cobalt)]" />}
                </div>

                <div className="grid grid-cols-2 divide-x divide-[var(--ink)]/20 border-b border-[var(--ink)]/20 py-5 text-center">
                  <div>
                    <Clock aria-hidden="true" className="mx-auto h-5 w-5 text-[var(--cobalt)]" />
                    <p className="mt-2 font-display text-2xl text-[var(--midnight)]">{totalHours}</p>
                    <p className="mt-1 font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">Hours logged</p>
                  </div>
                  <div className={`mx-4 border p-3 ${badge.className}`}>
                    <Award aria-hidden="true" className="mx-auto h-5 w-5" />
                    <p className="mt-2 font-body text-xs font-bold">{badge.name}</p>
                    <p className="mt-1 font-body text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">Badge tier</p>
                  </div>
                </div>

                <div className="mt-6 border-2 border-[var(--ink)]/15 bg-[var(--cream)] p-4 text-center">
                  <LocalMemberQr value={user.memberCode} size={180} alt={`Volunteer membership QR code for ${user.fullName}`} className="mx-auto select-none" />
                  <p className="mt-4 border-t border-[var(--ink)]/20 pt-3 font-body text-sm font-bold tracking-[0.16em] text-[var(--midnight)]">{user.memberCode}</p>
                  <p className="mt-1 font-body text-xs text-[var(--ink)]/60">Show this code at event check-in.</p>
                </div>

                {user.role === 'staff' && (
                  <Link
                    href="/volunteer/checkin"
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
                  >
                    <Camera aria-hidden="true" className="h-4 w-4" />
                    Open staff check-in
                  </Link>
                )}
              </section>

              <section className="border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-5 sm:p-7">
                <div className="flex items-end justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
                  <div>
                    <p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">History</p>
                    <h2 className="mt-2 font-display text-2xl text-[var(--midnight)]">Your volunteering</h2>
                  </div>
                  <QrCode aria-hidden="true" className="h-6 w-6 text-[var(--cobalt)]" />
                </div>
                {signups.length > 0 ? (
                  <ul className="divide-y divide-[var(--ink)]/20">
                    {signups.map((signup) => {
                      const attended = signup.status === 'attended'
                      return (
                        <li key={signup.id} className="flex items-start justify-between gap-4 py-4">
                          <div className="min-w-0">
                            <h3 className="truncate font-body text-sm font-bold text-[var(--midnight)]">{signup.eventTitle}</h3>
                            {attended && signup.checkedInAt && <p className="mt-1 font-body text-xs text-[var(--ink)]/55">Checked in {new Date(signup.checkedInAt).toLocaleDateString()}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-body text-xs font-bold uppercase tracking-[0.12em] text-[var(--cobalt)]">{signup.status}</span>
                            {attended && <p className="mt-1 font-body text-xs text-[var(--ink)]/60">+{signup.hours} hrs</p>}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div className="py-10 text-center">
                    <QrCode aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--ink)]/35" />
                    <p className="mt-3 font-body text-sm text-[var(--ink)]/60">No event history yet.</p>
                  </div>
                )}
              </section>
            </div>

            <section>
              <div className="mb-7 border-b-2 border-[var(--ink)] pb-5">
                <p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Volunteer roster</p>
                <h2 className="mt-2 font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Choose where to help.</h2>
                <p className="mt-3 font-body text-base leading-7 text-[var(--ink)]/65">Registration status is shown on each event. Closed and full events cannot be joined.</p>
              </div>

              {currentVolunteerEvents.length > 0 ? (
                <div className="divide-y-2 divide-[var(--ink)]/20 border-y-2 border-[var(--ink)]/20">
                  {currentVolunteerEvents.map((event) => {
                    const signup = signups.find((item) => item.eventId === event.id)
                    const attended = signup?.status === 'attended'
                    const registered = signup?.status === 'registered'
                    const open = event.volunteerRegistrationState === 'open'
                    const isDeepLinked = event.id === deepLinkedEventId

                    return (
                      <article
                        key={event.id}
                        ref={(node) => { eventRefs.current[event.id] = node }}
                        tabIndex={isDeepLinked ? -1 : undefined}
                        aria-labelledby={`volunteer-event-${event.id}`}
                        className={`py-7 outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--cream)] ${isDeepLinked ? 'border-l-4 border-[var(--cobalt)] bg-[var(--sky)]/20 pl-4 sm:pl-6' : ''}`}
                      >
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <RegistrationState state={event.volunteerRegistrationState} />
                              {isDeepLinked && <span className="border border-[var(--cobalt)] bg-[var(--paper)] px-2 py-1 font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cobalt)]">Selected from event page</span>}
                            </div>
                            <h3 id={`volunteer-event-${event.id}`} className="mt-2 font-display text-2xl leading-tight text-[var(--midnight)] sm:text-3xl">{event.title}</h3>
                            <p className="mt-3 max-w-2xl font-body text-sm leading-6 text-[var(--ink)]/70">{getVolunteerDescription(event)}</p>
                          </div>
                          <div className="shrink-0 sm:pt-1">
                            {attended ? (
                              <button type="button" disabled className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--cobalt)] bg-[var(--sky)]/45 px-4 py-3 font-body text-sm font-bold text-[var(--midnight)]"><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Attended</button>
                            ) : registered ? (
                              <button type="button" onClick={() => handleCancelForEvent(event.id)} disabled={cancellingEventId === event.id} className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--cobalt)] px-4 py-3 font-body text-sm font-bold text-[var(--cobalt)] transition hover:bg-[var(--sky)]/35 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]"><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> {cancellingEventId === event.id ? 'Cancelling…' : 'Cancel registration'}</button>
                            ) : (
                              <button type="button" onClick={() => handleRegisterForEvent(event)} disabled={!open || signingUpEventId === event.id} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--midnight)] px-4 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] disabled:cursor-not-allowed disabled:bg-[var(--ink)]/20 disabled:text-[var(--ink)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]">
                                {signingUpEventId === event.id ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : open ? 'Sign up to volunteer' : event.volunteerRegistrationState === 'full' ? 'Roster full' : 'Registration closed'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-5 max-w-2xl"><EventDetails event={event} /></div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="border-2 border-dashed border-[var(--ink)]/25 px-5 py-16 text-center">
                  <HeartHandshake aria-hidden="true" className="mx-auto h-10 w-10 text-[var(--cobalt)]" />
                  <h3 className="mt-4 font-display text-2xl text-[var(--midnight)]">No current volunteer events.</h3>
                  <p className="mt-2 font-body text-sm text-[var(--ink)]/65">Check back when the next opportunity is published.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] pt-16 text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-12 lg:py-28">
          <div>
            <p className="mb-6 font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Volunteer portal / Event support</p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.96] tracking-tight text-[var(--midnight)] sm:text-7xl lg:text-[6.8rem]">Bring your hands to the work.</h1>
            <p className="mt-7 max-w-2xl font-body text-lg leading-8 text-[var(--ink)]/70 sm:text-xl">Help with the practical details that make a STEM event welcoming: setup, greeting, activity support, and check-in.</p>
          </div>
          <div className="border-l-4 border-[var(--cobalt)] pl-6">
            <p className="font-body text-lg font-semibold leading-7 text-[var(--midnight)]">Event volunteering is a clear first step. Create an account to manage signups and receive a member code.</p>
            <a
              href={teamJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 border-b-2 border-[var(--cobalt)] pb-1 font-body text-sm font-bold text-[var(--cobalt)] transition hover:border-[var(--midnight)] hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--cream)]"
            >
              Join the team application
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        {pageError && <div role="alert" className="mb-8 border-l-4 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950">{pageError}</div>}

        <section className="border-b-2 border-[var(--ink)] pb-14">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">What volunteers do</p>
              <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Make the room work.</h2>
            </div>
            <div className="grid gap-0 divide-y divide-[var(--ink)]/20 border-y border-[var(--ink)]/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="py-5 sm:px-5 sm:py-2 sm:first:pl-0"><Wrench aria-hidden="true" className="h-6 w-6 text-[var(--cobalt)]" /><h3 className="mt-4 font-display text-2xl text-[var(--midnight)]">Set up</h3><p className="mt-2 font-body text-sm leading-6 text-[var(--ink)]/65">Prepare materials and help the space feel ready.</p></div>
              <div className="py-5 sm:px-5 sm:py-2"><Users aria-hidden="true" className="h-6 w-6 text-[var(--cobalt)]" /><h3 className="mt-4 font-display text-2xl text-[var(--midnight)]">Welcome</h3><p className="mt-2 font-body text-sm leading-6 text-[var(--ink)]/65">Greet attendees and help them find their way.</p></div>
              <div className="py-5 sm:pl-5 sm:py-2 sm:last:pr-0"><HeartHandshake aria-hidden="true" className="h-6 w-6 text-[var(--cobalt)]" /><h3 className="mt-4 font-display text-2xl text-[var(--midnight)]">Support</h3><p className="mt-2 font-body text-sm leading-6 text-[var(--ink)]/65">Assist activity leaders and keep the event moving.</p></div>
            </div>
          </div>
        </section>

        <section className="py-14" aria-labelledby="current-volunteer-events">
          <div className="mb-8 flex flex-col gap-4 border-b-2 border-[var(--ink)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Current opportunities</p>
              <h2 id="current-volunteer-events" className="mt-2 font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Choose a place to help.</h2>
            </div>
            <p className="max-w-sm font-body text-sm leading-6 text-[var(--ink)]/65">Open events can be joined after you sign in. Closed and full events stay visible with their current status.</p>
          </div>

          {currentVolunteerEvents.length > 0 ? (
            <div className="divide-y-2 divide-[var(--ink)]/20 border-y-2 border-[var(--ink)]/20">
              {currentVolunteerEvents.map((event) => {
                const open = event.volunteerRegistrationState === 'open'
                const isDeepLinked = event.id === deepLinkedEventId
                return (
                  <article
                    key={event.id}
                    ref={(node) => { eventRefs.current[event.id] = node }}
                    tabIndex={isDeepLinked ? -1 : undefined}
                    aria-labelledby={`volunteer-event-${event.id}`}
                    className={`py-7 outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--cream)] ${isDeepLinked ? 'border-l-4 border-[var(--cobalt)] bg-[var(--sky)]/20 pl-4 sm:pl-6' : ''}`}
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <RegistrationState state={event.volunteerRegistrationState} />
                          {isDeepLinked && <span className="border border-[var(--cobalt)] bg-[var(--paper)] px-2 py-1 font-body text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cobalt)]">Selected from event page</span>}
                        </div>
                        <h3 id={`volunteer-event-${event.id}`} className="mt-2 font-display text-2xl leading-tight text-[var(--midnight)] sm:text-3xl">{event.title}</h3>
                        <p className="mt-3 max-w-2xl font-body text-sm leading-6 text-[var(--ink)]/70">{getVolunteerDescription(event)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={scrollToSignup}
                        disabled={!open}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-[var(--midnight)] px-4 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] disabled:cursor-not-allowed disabled:bg-[var(--ink)]/15 disabled:text-[var(--ink)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
                      >
                        {open ? <>Sign in to volunteer <ArrowRight aria-hidden="true" className="h-4 w-4" /></> : event.volunteerRegistrationState === 'full' ? 'Roster full' : 'Registration closed'}
                      </button>
                    </div>
                    <div className="mt-5 max-w-2xl"><EventDetails event={event} /></div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-[var(--ink)]/25 px-5 py-16 text-center">
              <Calendar aria-hidden="true" className="mx-auto h-10 w-10 text-[var(--cobalt)]" />
              <h3 className="mt-4 font-display text-2xl text-[var(--midnight)]">No current volunteer events.</h3>
              <p className="mt-2 font-body text-sm text-[var(--ink)]/65">Check back when the next opportunity is published.</p>
            </div>
          )}
        </section>

        <section ref={formRef} id="volunteer-signup" className="scroll-mt-24 border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-6 text-center sm:p-10">
          <HeartHandshake aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--cobalt)]" />
          <p className="mt-4 font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Join the roster</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--midnight)]">Create a volunteer account.</h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base leading-7 text-[var(--ink)]/65">Use Google sign-in to join the volunteer list, receive a QR check-in code, and manage event registrations.</p>
          <button
            type="button"
            onClick={openAuthModal}
            className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--midnight)] px-6 py-3 font-body font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
          >
            Create a volunteer account
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </section>
      </div>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--midnight)]/75 px-5 py-8" role="presentation">
          <div aria-hidden="true" className="absolute inset-0 cursor-default" onClick={() => setIsAuthModalOpen(false)} />
          <div ref={authDialogRef} role="dialog" aria-modal="true" aria-labelledby="volunteer-auth-title" className="relative z-10 w-full max-w-md border-2 border-[var(--ink)] bg-[var(--cream)] p-6 text-[var(--ink)] shadow-[8px_8px_0_var(--sky)] sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
              <div>
                <p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Secure sign-in</p>
                <h2 id="volunteer-auth-title" className="mt-3 font-display text-3xl leading-tight text-[var(--midnight)]">Join the volunteer roster.</h2>
              </div>
              <button ref={authCloseRef} type="button" onClick={() => setIsAuthModalOpen(false)} aria-label="Close authentication modal" className="inline-flex min-h-11 min-w-11 items-center justify-center border-2 border-[var(--ink)] font-body text-xl text-[var(--midnight)] transition hover:bg-[var(--paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]">×</button>
            </div>
            <p className="mt-5 font-body text-sm leading-6 text-[var(--ink)]/70">Use Google sign-in to create or access your volunteer profile. No alternate sign-in method is offered here.</p>
            <button
              type="button"
              onClick={handleGoogleSSO}
              disabled={authLoading}
              className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-3 border-2 border-[var(--ink)] bg-[var(--paper)] px-5 py-3 font-body font-bold text-[var(--midnight)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
            >
              {authLoading ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : <span aria-hidden="true" className="font-bold text-[var(--cobalt)]">G</span>}
              {authLoading ? 'Connecting to Google…' : 'Continue with Google'}
            </button>
            {authError && <div role="alert" aria-live="polite" className="mt-5 border-l-4 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950">{authError}</div>}
            <p className="mt-5 font-body text-xs leading-5 text-[var(--ink)]/55">You can close this window at any time. Your focus will return to the account button.</p>
          </div>
        </div>
      )}
    </main>
  )
}
