'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Event } from '@/data/events'
import { volunteerService, type VolunteerProfile, type VolunteerSignup } from '@/lib/volunteerService'
import { LocalMemberQr } from '@/components/LocalMemberQr'
import SignalPageIntro from '@/components/site/SignalPageIntro'
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
    <details className="group border-t border-[var(--carbon)]/25 pt-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 signal-mono text-[var(--ultramarine)] outline-none transition hover:text-[var(--signal-orange)] focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span>View event details</span>
        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-open:translate-x-1" />
      </summary>
      <div className="space-y-3 pb-2 pt-4 font-body text-sm leading-6 text-[var(--carbon)]/70">
        <p className="flex items-start gap-3"><Calendar aria-hidden="true" className="mt-1 h-4 w-4 flex-none text-[var(--signal-orange)]" /><span><strong className="text-[var(--carbon)]">Date:</strong> {event.date || 'Details coming soon'}</span></p>
        <p className="flex items-start gap-3"><Clock aria-hidden="true" className="mt-1 h-4 w-4 flex-none text-[var(--signal-orange)]" /><span><strong className="text-[var(--carbon)]">Time:</strong> {event.time || 'Details coming soon'}</span></p>
        <p className="flex items-start gap-3"><MapPin aria-hidden="true" className="mt-1 h-4 w-4 flex-none text-[var(--signal-orange)]" /><span><strong className="text-[var(--carbon)]">Location:</strong> {event.location || 'Details coming soon'}</span></p>
        {event.description && <p className="border-t border-[var(--carbon)]/15 pt-3">{event.description}</p>}
      </div>
    </details>
  )
}

function RegistrationState({ state }: { state: Event['volunteerRegistrationState'] }) {
  if (state === 'open') return <span className="signal-mono text-[var(--ultramarine)]"><span className="mr-1 inline-block h-2 w-2 bg-[var(--signal-orange)]" aria-hidden="true" />Registration open</span>
  if (state === 'full') return <span className="signal-mono text-[var(--carbon)]/55">Volunteer roster full</span>
  return <span className="signal-mono text-[var(--carbon)]/55">Registration closed</span>
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
    ? { name: 'Gold Champion', className: 'border-[var(--signal-orange)] bg-[var(--signal-orange)] text-[var(--carbon)]' }
    : totalHours >= 10
      ? { name: 'Silver Leader', className: 'border-[var(--mist)] bg-[var(--off-white)] text-[var(--carbon)]' }
      : { name: 'Bronze Helper', className: 'border-[var(--ultramarine)] bg-[var(--mist)] text-[var(--carbon)]' }

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
      <main className="flex min-h-screen items-center justify-center bg-[var(--bone)] px-5 text-[var(--carbon)]">
        <div className="flex max-w-md flex-col items-center text-center">
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-[var(--ultramarine)] motion-reduce:animate-none" />
          <p className="mt-4 signal-mono text-[var(--carbon)]/70">Loading the volunteer portal…</p>
        </div>
      </main>
    )
  }

  if (user) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[var(--bone)] text-[var(--carbon)]">
        <header className="border-b border-[var(--carbon)]/30 bg-[var(--bone)]">
          <div className="signal-shell flex flex-col gap-8 py-12 sm:py-16 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="signal-mono text-[var(--signal-orange)]">CREW DESK / ACTIVE ROSTER</p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[0.94] tracking-[-0.05em] text-[var(--carbon)] sm:text-5xl">Your volunteer shift, in one place.</h1>
              <p className="mt-5 font-body text-base leading-7 text-[var(--carbon)]/65">Manage your event registrations, member code, and volunteer history.</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="signal-button signal-button--line self-start lg:self-auto"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>

        <div className="signal-shell py-10 sm:py-16">
          {pageError && <div role="alert" className="mb-8 border-l-2 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950">{pageError}</div>}

          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-8">
              <section className="border border-[var(--carbon)]/35 bg-[var(--off-white)] p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--carbon)] pb-5">
                  <div className="flex items-start gap-4">
                    <User aria-hidden="true" className="mt-1 h-6 w-6 text-[var(--signal-orange)]" />
                    <div>
                      <h2 className="font-display text-2xl font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--carbon)]">Your member record</h2>
                      <p className="mt-1 break-all signal-mono text-[var(--carbon)]/60">{user.email}</p>
                    </div>
                  </div>
                  {user.role === 'staff' && <ShieldCheck aria-label="Verified staff" className="h-6 w-6 text-[var(--ultramarine)]" />}
                </div>

                <div className="grid grid-cols-2 divide-x divide-[var(--carbon)]/20 border-b border-[var(--carbon)]/20 py-5 text-center">
                  <div>
                    <Clock aria-hidden="true" className="mx-auto h-5 w-5 text-[var(--signal-orange)]" />
                    <p className="mt-2 font-display text-2xl font-semibold text-[var(--carbon)]">{totalHours}</p>
                    <p className="mt-1 signal-mono text-[var(--carbon)]/55">Hours logged</p>
                  </div>
                  <div className={`mx-4 border p-3 ${badge.className}`}>
                    <Award aria-hidden="true" className="mx-auto h-5 w-5" />
                    <p className="mt-2 signal-mono">{badge.name}</p>
                    <p className="mt-1 signal-mono opacity-70">Badge tier</p>
                  </div>
                </div>

                <div className="mt-6 border border-[var(--carbon)]/25 bg-[var(--bone)] p-4 text-center">
                  <LocalMemberQr value={user.memberCode} size={180} alt={`Volunteer membership QR code for ${user.fullName}`} className="mx-auto select-none" />
                  <p className="mt-4 border-t border-[var(--carbon)]/20 pt-3 signal-mono text-[var(--carbon)]">{user.memberCode}</p>
                  <p className="mt-1 font-body text-xs text-[var(--carbon)]/60">Show this code at event check-in.</p>
                </div>

                {user.role === 'staff' && (
                  <Link
                    href="/volunteer/checkin"
                    className="signal-button signal-button--orange mt-6 w-full"
                  >
                    <Camera aria-hidden="true" className="h-4 w-4" />
                    Open staff check-in
                  </Link>
                )}
              </section>

              <section className="border border-[var(--carbon)]/35 bg-[var(--off-white)] p-5 sm:p-7">
                <div className="flex items-end justify-between gap-4 border-b border-[var(--carbon)] pb-5">
                  <div>
                    <p className="signal-mono text-[var(--signal-orange)]">HISTORY / MEMBER RECORD</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--carbon)]">Your volunteering</h2>
                  </div>
                  <QrCode aria-hidden="true" className="h-6 w-6 text-[var(--ultramarine)]" />
                </div>
                {signups.length > 0 ? (
                  <ul className="divide-y divide-[var(--carbon)]/20">
                    {signups.map((signup) => {
                      const attended = signup.status === 'attended'
                      return (
                        <li key={signup.id} className="flex items-start justify-between gap-4 py-4">
                          <div className="min-w-0">
                            <h3 className="truncate font-body text-sm font-bold text-[var(--carbon)]">{signup.eventTitle}</h3>
                            {attended && signup.checkedInAt && <p className="mt-1 signal-mono text-[var(--carbon)]/55">Checked in {new Date(signup.checkedInAt).toLocaleDateString()}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="signal-mono text-[var(--ultramarine)]">{signup.status}</span>
                            {attended && <p className="mt-1 signal-mono text-[var(--carbon)]/60">+{signup.hours} hrs</p>}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div className="py-10 text-center">
                    <QrCode aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--carbon)]/35" />
                    <p className="mt-3 signal-mono text-[var(--carbon)]/60">No event history yet.</p>
                  </div>
                )}
              </section>
            </div>

            <section>
              <div className="mb-7 border-b border-[var(--carbon)] pb-5">
                <p className="signal-mono text-[var(--signal-orange)]">ROSTER / OPEN SHIFTS</p>
                <h2 className="mt-2 font-display text-4xl font-semibold leading-[0.93] tracking-[-0.05em] text-[var(--carbon)] sm:text-5xl">Choose where to help.</h2>
                <p className="mt-3 font-body text-base leading-7 text-[var(--carbon)]/65">Registration status is shown on each event. Closed and full events cannot be joined.</p>
              </div>

              {currentVolunteerEvents.length > 0 ? (
                <div className="divide-y divide-[var(--carbon)]/25 border-y border-[var(--carbon)]/25">
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
                        className={`py-7 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ultramarine)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bone)] ${isDeepLinked ? 'border-l-2 border-[var(--signal-orange)] bg-[var(--mist)]/30 pl-4 sm:pl-6' : ''}`}
                      >
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <RegistrationState state={event.volunteerRegistrationState} />
                              {isDeepLinked && <span className="border border-[var(--signal-orange)] bg-[var(--off-white)] px-2 py-1 signal-mono text-[var(--ultramarine)]">Selected from event page</span>}
                            </div>
                            <h3 id={`volunteer-event-${event.id}`} className="mt-2 font-display text-2xl font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--carbon)] sm:text-3xl">{event.title}</h3>
                            <p className="mt-3 max-w-2xl font-body text-sm leading-6 text-[var(--carbon)]/70">{getVolunteerDescription(event)}</p>
                          </div>
                          <div className="shrink-0 sm:pt-1">
                            {attended ? (
                              <button type="button" disabled className="signal-button border-[var(--ultramarine)] bg-[var(--mist)] text-[var(--carbon)]"><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Attended</button>
                            ) : registered ? (
                              <button type="button" onClick={() => handleCancelForEvent(event.id)} disabled={cancellingEventId === event.id} className="signal-button signal-button--line border-[var(--ultramarine)] text-[var(--ultramarine)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]"><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> {cancellingEventId === event.id ? 'Cancelling…' : 'Cancel registration'}</button>
                            ) : (
                              <button type="button" onClick={() => handleRegisterForEvent(event)} disabled={!open || signingUpEventId === event.id} className="signal-button signal-button--orange disabled:cursor-not-allowed disabled:bg-[var(--carbon)]/15 disabled:text-[var(--carbon)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bone)]">
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
                <div className="border border-dashed border-[var(--carbon)]/35 px-5 py-16 text-center">
                  <HeartHandshake aria-hidden="true" className="mx-auto h-10 w-10 text-[var(--signal-orange)]" />
                  <h3 className="mt-4 font-display text-2xl font-semibold text-[var(--carbon)]">No current volunteer events.</h3>
                  <p className="mt-2 font-body text-sm text-[var(--carbon)]/65">Check back when the next opportunity is published.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--bone)] text-[var(--carbon)]">
      <SignalPageIntro
        eyebrow="CREW DESK / 01"
        title="Bring your hands to the work."
        description="Help with the practical details that make a STEM event welcoming: setup, greeting, activity support, and check-in."
        image={{
          src: '/images/events/family-science-night/IMG_5898.jpg',
          alt: 'A student volunteer guides two younger students with a robot controller.',
        }}
        tone="bone"
        imagePosition="center"
        actions={(
          <a href={teamJoinUrl} target="_blank" rel="noopener noreferrer" className="signal-button signal-button--orange">
            Join the team application
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </a>
        )}
      />

      <div className="signal-shell py-16 sm:py-20 lg:py-28">
        {pageError && <div role="alert" className="mb-8 border-l-2 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950">{pageError}</div>}

        <section className="border-b border-[var(--carbon)]/25 pb-14">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="signal-mono text-[var(--signal-orange)]">SHIFT ROUTE / 02 · CREW DESK</p>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-[0.93] tracking-[-0.05em] text-[var(--carbon)] sm:text-5xl">Show up, help out, leave a path behind.</h2>
              <p className="mt-4 max-w-sm font-body text-base leading-7 text-[var(--carbon)]/65">
                Pick an open opportunity, sign in with Google, then bring your member code to the event.
              </p>
            </div>
            <ol className="divide-y divide-[var(--carbon)]/20 border-y border-[var(--carbon)]/20">
              <li className="grid gap-4 py-5 sm:grid-cols-[3rem_1fr] sm:items-start">
                <span className="signal-mono text-[var(--signal-orange)]">01</span>
                <div className="flex gap-4">
                  <Wrench aria-hidden="true" className="mt-1 h-6 w-6 flex-none text-[var(--ultramarine)]" />
                  <div><h3 className="font-display text-2xl font-semibold text-[var(--carbon)]">Choose a shift</h3><p className="mt-1 font-body text-sm leading-6 text-[var(--carbon)]/65">Find an open event and read what the room needs.</p></div>
                </div>
              </li>
              <li className="grid gap-4 py-5 sm:grid-cols-[3rem_1fr] sm:items-start">
                <span className="signal-mono text-[var(--signal-orange)]">02</span>
                <div className="flex gap-4">
                  <Users aria-hidden="true" className="mt-1 h-6 w-6 flex-none text-[var(--ultramarine)]" />
                  <div><h3 className="font-display text-2xl font-semibold text-[var(--carbon)]">Make the room welcoming</h3><p className="mt-1 font-body text-sm leading-6 text-[var(--carbon)]/65">Set up materials, greet attendees, and support the activity lead.</p></div>
                </div>
              </li>
              <li className="grid gap-4 py-5 sm:grid-cols-[3rem_1fr] sm:items-start">
                <span className="signal-mono text-[var(--signal-orange)]">03</span>
                <div className="flex gap-4">
                  <HeartHandshake aria-hidden="true" className="mt-1 h-6 w-6 flex-none text-[var(--ultramarine)]" />
                  <div><h3 className="font-display text-2xl font-semibold text-[var(--carbon)]">Check in and keep going</h3><p className="mt-1 font-body text-sm leading-6 text-[var(--carbon)]/65">Show your QR code, help students get unstuck, and keep your history in one place.</p></div>
                </div>
              </li>
            </ol>
            <figure className="relative mt-8 aspect-[16/6] overflow-hidden border border-[var(--carbon)]/35 bg-[var(--mist)]">
              <Image
                src="/images/events/family-science-night/IMG_5905.jpg"
                alt="Student volunteers gather around robotics equipment during Family Science Night."
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover object-center"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--carbon)]/85 px-4 py-3 signal-mono text-[var(--off-white)]">ROOM CHECK / BRING THE ENERGY</figcaption>
            </figure>
          </div>
        </section>

        <section className="py-14" aria-labelledby="current-volunteer-events">
          <div className="mb-8 flex flex-col gap-4 border-b border-[var(--carbon)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="signal-mono text-[var(--signal-orange)]">ROSTER / CURRENT OPPORTUNITIES</p>
              <h2 id="current-volunteer-events" className="mt-2 font-display text-4xl font-semibold leading-[0.93] tracking-[-0.05em] text-[var(--carbon)] sm:text-5xl">Choose a place to help.</h2>
            </div>
            <p className="max-w-sm font-body text-sm leading-6 text-[var(--carbon)]/65">Open events can be joined after you sign in. Closed and full events stay visible with their current status.</p>
          </div>

          {currentVolunteerEvents.length > 0 ? (
            <div className="divide-y divide-[var(--carbon)]/25 border-y border-[var(--carbon)]/25">
              {currentVolunteerEvents.map((event) => {
                const open = event.volunteerRegistrationState === 'open'
                const isDeepLinked = event.id === deepLinkedEventId
                return (
                  <article
                    key={event.id}
                    ref={(node) => { eventRefs.current[event.id] = node }}
                    tabIndex={isDeepLinked ? -1 : undefined}
                    aria-labelledby={`volunteer-event-${event.id}`}
                    className={`py-7 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ultramarine)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bone)] ${isDeepLinked ? 'border-l-2 border-[var(--signal-orange)] bg-[var(--mist)]/30 pl-4 sm:pl-6' : ''}`}
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <RegistrationState state={event.volunteerRegistrationState} />
                          {isDeepLinked && <span className="border border-[var(--signal-orange)] bg-[var(--off-white)] px-2 py-1 signal-mono text-[var(--ultramarine)]">Selected from event page</span>}
                        </div>
                        <h3 id={`volunteer-event-${event.id}`} className="mt-2 font-display text-2xl font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--carbon)] sm:text-3xl">{event.title}</h3>
                        <p className="mt-3 max-w-2xl font-body text-sm leading-6 text-[var(--carbon)]/70">{getVolunteerDescription(event)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={scrollToSignup}
                        disabled={!open}
                        className="signal-button signal-button--orange shrink-0 disabled:cursor-not-allowed disabled:bg-[var(--carbon)]/15 disabled:text-[var(--carbon)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bone)]"
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
            <div className="border border-dashed border-[var(--carbon)]/35 px-5 py-16 text-center">
              <Calendar aria-hidden="true" className="mx-auto h-10 w-10 text-[var(--signal-orange)]" />
              <h3 className="mt-4 font-display text-2xl font-semibold text-[var(--carbon)]">No current volunteer events.</h3>
              <p className="mt-2 font-body text-sm text-[var(--carbon)]/65">Check back when the next opportunity is published.</p>
            </div>
          )}
        </section>

        <section ref={formRef} id="volunteer-signup" className="scroll-mt-24 border border-[var(--carbon)]/35 bg-[var(--off-white)] p-6 text-center sm:p-10">
          <HeartHandshake aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--signal-orange)]" />
          <p className="mt-4 signal-mono text-[var(--signal-orange)]">ACCESS BADGE / 03 · JOIN THE ROSTER</p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-[0.93] tracking-[-0.05em] text-[var(--carbon)]">Create a volunteer account.</h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base leading-7 text-[var(--carbon)]/65">Use Google sign-in to join the volunteer list, receive a QR check-in code, and manage event registrations.</p>
          <button
            type="button"
            onClick={openAuthModal}
            className="signal-button signal-button--orange mt-7"
          >
            Create a volunteer account
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </section>
      </div>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--carbon)]/85 px-5 py-8" role="presentation">
          <div aria-hidden="true" className="absolute inset-0 cursor-default" onClick={() => setIsAuthModalOpen(false)} />
          <div ref={authDialogRef} role="dialog" aria-modal="true" aria-labelledby="volunteer-auth-title" className="relative z-10 w-full max-w-md border border-[var(--carbon)] bg-[var(--bone)] p-6 text-[var(--carbon)] shadow-[8px_8px_0_var(--signal-orange)] sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--carbon)] pb-5">
              <div>
                <p className="signal-mono text-[var(--signal-orange)]">ACCESS BADGE / GOOGLE SSO</p>
                <h2 id="volunteer-auth-title" className="mt-3 font-display text-3xl font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--carbon)]">Join the volunteer roster.</h2>
              </div>
              <button ref={authCloseRef} type="button" onClick={() => setIsAuthModalOpen(false)} aria-label="Close authentication modal" className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--carbon)] font-body text-xl text-[var(--carbon)] transition hover:bg-[var(--off-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]">×</button>
            </div>
            <p className="mt-5 font-body text-sm leading-6 text-[var(--carbon)]/70">Use Google sign-in to create or access your volunteer profile. No alternate sign-in method is offered here.</p>
            <button
              type="button"
              onClick={handleGoogleSSO}
              disabled={authLoading}
              className="signal-button signal-button--line mt-7 w-full bg-[var(--off-white)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]"
            >
              {authLoading ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : <span aria-hidden="true" className="font-bold text-[var(--ultramarine)]">G</span>}
              {authLoading ? 'Connecting to Google…' : 'Continue with Google'}
            </button>
            {authError && <div role="alert" aria-live="polite" className="mt-5 border-l-2 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950">{authError}</div>}
            <p className="mt-5 font-body text-xs leading-5 text-[var(--carbon)]/55">You can close this window at any time. Your focus will return to the account button.</p>
          </div>
        </div>
      )}
    </main>
  )
}
