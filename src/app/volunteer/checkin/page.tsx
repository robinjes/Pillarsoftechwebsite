'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Html5Qrcode } from 'html5-qrcode'
import type { Event } from '@/data/events'
import {
  volunteerService,
  type ActiveCheckInSession,
  type EventRosterEntry,
  type StaffAttendanceResult,
  type VolunteerProfile,
} from '@/lib/volunteerService'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'

type ScannerState = 'idle' | 'loading' | 'active' | 'error'

async function stopScanner(scanner: Html5Qrcode) {
  try {
    if (scanner.isScanning) await scanner.stop()
  } catch {
    // The camera may already be stopped by the browser.
  }
  try {
    scanner.clear()
  } catch {
    // Clearing an already detached scanner is harmless.
  }
}

function EventMeta({ event }: { event: Event }) {
  return (
    <div className="grid gap-3 border-t border-[var(--ink)]/20 pt-4 font-body text-sm text-[var(--ink)]/70 sm:grid-cols-3">
      <p className="flex items-start gap-2"><Calendar aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[var(--cobalt)]" /><span>{event.date || 'Date coming soon'}</span></p>
      <p className="flex items-start gap-2"><Clock aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[var(--cobalt)]" /><span>{event.time || 'Time coming soon'}</span></p>
      <p className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[var(--cobalt)]" /><span>{event.location || 'Location coming soon'}</span></p>
    </div>
  )
}

export default function CheckinPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [recentScan, setRecentScan] = useState<StaffAttendanceResult | null>(null)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinError, setCheckinError] = useState('')
  const [activeCheckIns, setActiveCheckIns] = useState<ActiveCheckInSession[]>([])
  const [activeLoading, setActiveLoading] = useState(false)
  const [activeError, setActiveError] = useState('')
  const [eventRoster, setEventRoster] = useState<EventRosterEntry[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState('')

  const [manualCode, setManualCode] = useState('')
  const [manualSearch, setManualSearch] = useState('')
  const [manualSearchResults, setManualSearchResults] = useState<VolunteerProfile[]>([])
  const [manualSearchLoading, setManualSearchLoading] = useState(false)
  const [manualSearchError, setManualSearchError] = useState('')

  const [allProfiles, setAllProfiles] = useState<VolunteerProfile[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  const beepPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCodeScanRef = useRef<(code: string) => void>(() => undefined)

  const selectedEvent = events.find((event) => event.id === selectedEventId)

  const loadActiveCheckIns = useCallback(async () => {
    setActiveLoading(true)
    setActiveError('')
    try {
      setActiveCheckIns(await volunteerService.getActiveCheckInSessions())
    } catch {
      setActiveError('Active check-ins are temporarily unavailable.')
    } finally {
      setActiveLoading(false)
    }
  }, [])

  const loadEventRoster = useCallback(async (eventId = selectedEventId) => {
    if (!eventId) {
      setEventRoster([])
      return
    }
    setRosterLoading(true)
    setRosterError('')
    try {
      setEventRoster(await volunteerService.getEventRoster(eventId))
    } catch {
      setRosterError('This event roster is temporarily unavailable.')
    } finally {
      setRosterLoading(false)
    }
  }, [selectedEventId])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      let profile: VolunteerProfile | null = null
      try {
        profile = await volunteerService.getCurrentUser()
      } catch {
        if (mounted) {
          setPageError('Staff verification is temporarily unavailable.')
          setLoading(false)
        }
        return
      }

      if (!mounted) return
      if (!profile || profile.role !== 'staff') {
        router.replace('/volunteer')
        return
      }

      try {
        const response = await fetch('/api/events', { cache: 'no-store' })
        const data: unknown = await response.json()
        if (!response.ok || !Array.isArray(data)) throw new Error('Events unavailable')
        if (mounted) {
          const nextEvents = data as Event[]
          setEvents(nextEvents)
          const firstUpcoming = nextEvents.find((event) => event.status === 'upcoming')
          if (firstUpcoming) setSelectedEventId(firstUpcoming.id)
        }
      } catch {
        if (mounted) setPageError('Event data is temporarily unavailable.')
      }

      if (mounted) {
        setLoading(false)
        void loadActiveCheckIns()
      }
    }

    void init()
    return () => {
      mounted = false
    }
  }, [loadActiveCheckIns, router])

  useEffect(() => {
    if (!selectedEventId) {
      setEventRoster([])
      return
    }
    void loadEventRoster(selectedEventId)
  }, [loadEventRoster, selectedEventId])

  useEffect(() => {
    let mounted = true
    const query = manualSearch.trim()
    if (query.length < 2) {
      setManualSearchResults([])
      setManualSearchLoading(false)
      setManualSearchError('')
      return () => {
        mounted = false
      }
    }

    setManualSearchLoading(true)
    setManualSearchError('')
    const timer = window.setTimeout(() => {
      void volunteerService.searchProfiles(query)
        .then((results) => {
          if (mounted) setManualSearchResults(results)
        })
        .catch(() => {
          if (mounted) {
            setManualSearchResults([])
            setManualSearchError('Volunteer search is temporarily unavailable.')
          }
        })
        .finally(() => {
          if (mounted) setManualSearchLoading(false)
        })
    }, 250)

    return () => {
      mounted = false
      window.clearTimeout(timer)
    }
  }, [manualSearch])

  useEffect(() => {
    if (!cameraActive || !selectedEventId) {
      setCameraLoading(false)
      return undefined
    }

    let cancelled = false
    setCameraLoading(true)
    setScannerState('loading')
    setCameraError('')

    const timer = window.setTimeout(() => {
      void import('html5-qrcode')
        .then(async ({ Html5Qrcode }) => {
          if (cancelled) return
          const scanner = new Html5Qrcode('qr-reader')
          scannerRef.current = scanner
          try {
            await scanner.start(
              { facingMode: 'environment' },
              {
                fps: 10,
                qrbox: (width, height) => {
                  const size = Math.min(width, height) * 0.7
                  return { width: size, height: size }
                },
              },
              (decodedText) => handleCodeScanRef.current(decodedText),
              () => undefined,
            )
            if (cancelled) {
              await stopScanner(scanner)
              return
            }
            setCameraLoading(false)
            setScannerState('active')
          } catch {
            await stopScanner(scanner)
            if (!cancelled) {
              setCameraLoading(false)
              setScannerState('error')
              setCameraError('Camera access was denied or the device is busy.')
              setCameraActive(false)
            }
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCameraLoading(false)
            setScannerState('error')
            setCameraError('The scanner could not be loaded. Use manual member-code entry instead.')
            setCameraActive(false)
          }
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) void stopScanner(scanner)
    }
  }, [cameraActive, selectedEventId])

  useEffect(() => {
    return () => {
      if (beepPlayTimeoutRef.current) clearTimeout(beepPlayTimeoutRef.current)
      const scanner = scannerRef.current
      if (scanner) void stopScanner(scanner)
    }
  }, [])

  const playSuccessBeep = () => {
    try {
      type WindowWithWebkitAudioContext = Window & { webkitAudioContext?: typeof AudioContext }
      const AudioContextConstructor = window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext
      if (!AudioContextConstructor) return
      const audioContext = new AudioContextConstructor()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
      gain.gain.setValueAtTime(0.15, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.35)
    } catch {
      // A browser may block audio until the first user interaction.
    }
  }

  const handleCodeScan = async (code: string) => {
    if (checkinLoading || recentScan || !selectedEventId) return
    setCheckinLoading(true)
    setCheckinError('')
    try {
      const result = await volunteerService.checkInVolunteer(code, selectedEventId)
      playSuccessBeep()
      setRecentScan(result)
      await Promise.all([loadActiveCheckIns(), loadEventRoster()])
      if (beepPlayTimeoutRef.current) clearTimeout(beepPlayTimeoutRef.current)
      beepPlayTimeoutRef.current = setTimeout(() => setRecentScan(null), 4000)
    } catch (error) {
      setCheckinError(error instanceof Error ? error.message : 'Check-in failed. Check the member code.')
    } finally {
      setCheckinLoading(false)
    }
  }

  handleCodeScanRef.current = handleCodeScan

  const handleManualCheckIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!manualCode || !selectedEventId) return
    void handleCodeScan(manualCode)
    setManualCode('')
  }

  const loadAllProfiles = async () => {
    setSettingsLoading(true)
    setSettingsError('')
    try {
      setAllProfiles(await volunteerService.getAllProfiles())
    } catch {
      setSettingsError('Staff profile data is temporarily unavailable.')
    } finally {
      setSettingsLoading(false)
    }
  }

  const exportRosterCsv = async () => {
    if (!selectedEvent) return
    try {
      await volunteerService.downloadAttendanceCsv(selectedEvent.id)
    } catch (error) {
      setCheckinError(error instanceof Error ? error.message : 'The roster export could not be created.')
    }
  }

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to log out?')) return
    try {
      await volunteerService.signOut()
    } catch {
      setPageError('We could not sign you out. Please try again.')
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-5 pt-16 text-[var(--ink)]">
        <div className="text-center">
          <RefreshCw aria-hidden="true" className="mx-auto h-8 w-8 animate-spin text-[var(--cobalt)] motion-reduce:animate-none" />
          <p className="mt-4 font-body text-sm text-[var(--ink)]/70">Verifying staff access…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] pt-16 text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)]/20">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/volunteer" onClick={() => setCameraActive(false)} className="inline-flex min-h-11 items-center gap-2 font-body text-sm font-bold text-[var(--cobalt)] underline decoration-2 underline-offset-4 transition hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Volunteer portal
              </Link>
              <p className="mt-8 font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Staff / Attendance desk</p>
              <h1 className="mt-3 max-w-4xl font-display text-5xl leading-[0.96] tracking-tight text-[var(--midnight)] sm:text-7xl">Check in the room.</h1>
              <p className="mt-5 max-w-2xl font-body text-base leading-7 text-[var(--ink)]/65">Use the scanner or a member code to record arrival and departure. Staff access is verified by the server before this page loads.</p>
            </div>
            <div className="flex flex-wrap gap-3 sm:pt-11">
              <button type="button" onClick={() => { setShowSettings((current) => !current); if (!showSettings) void loadAllProfiles() }} className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--ink)] px-4 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"><Settings aria-hidden="true" className="h-4 w-4" /> Staff settings</button>
              <button type="button" onClick={handleLogout} className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-red-800 px-4 py-3 font-body text-sm font-bold text-red-900 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"><LogOut aria-hidden="true" className="h-4 w-4" /> Log out</button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
        {pageError && <div role="alert" className="mb-8 border-l-4 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950">{pageError}</div>}

        {showSettings && (
          <section className="mb-10 border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-5 sm:p-7" aria-labelledby="staff-settings-title">
            <div className="flex flex-col gap-5 border-b-2 border-[var(--ink)] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Read-only directory</p>
                <h2 id="staff-settings-title" className="mt-2 font-display text-3xl text-[var(--midnight)]">Staff settings</h2>
                <p className="mt-2 font-body text-sm leading-6 text-[var(--ink)]/65">View server-controlled profiles. Membership changes remain owner-only operations.</p>
              </div>
              <button type="button" onClick={() => void loadAllProfiles()} disabled={settingsLoading} className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--ink)] px-4 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--cream)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${settingsLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} /> Refresh</button>
            </div>
            {settingsError && <p role="alert" className="mt-5 border-l-4 border-red-700 bg-red-100 px-4 py-3 font-body text-sm text-red-950">{settingsError}</p>}
            {settingsLoading ? <p className="py-8 text-center font-body text-sm text-[var(--ink)]/65">Loading profiles…</p> : allProfiles.length > 0 ? (
              <ul className="divide-y divide-[var(--ink)]/20">
                {allProfiles.map((profile) => <li key={profile.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-body font-bold text-[var(--midnight)]">{profile.fullName}</p><p className="mt-1 break-all font-body text-xs text-[var(--ink)]/60">{profile.email} · {profile.memberCode}</p></div><span className="font-body text-xs font-bold uppercase tracking-[0.16em] text-[var(--cobalt)]">{profile.role}</span></li>)}
              </ul>
            ) : <p className="py-8 text-center font-body text-sm text-[var(--ink)]/65">No profiles found.</p>}
          </section>
        )}

        <section className="border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-5 sm:p-7" aria-labelledby="event-selection-title">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Step one</p>
              <h2 id="event-selection-title" className="mt-2 font-display text-3xl text-[var(--midnight)]">Select a check-in event.</h2>
              <label htmlFor="event-select" className="mt-5 block font-body text-sm font-bold text-[var(--midnight)]">Event</label>
              <select id="event-select" value={selectedEventId} onChange={(event) => { setSelectedEventId(event.target.value); setCameraActive(false) }} disabled={events.length === 0} className="mt-2 min-h-11 w-full rounded-md border-2 border-[var(--ink)]/25 bg-[var(--cream)] px-4 py-3 font-body text-[var(--ink)] outline-none focus-visible:border-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)] sm:max-w-xl">
                <option value="" disabled>{events.length === 0 ? 'No events available' : 'Select an event'}</option>
                {events.filter((event) => event.status === 'upcoming').map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
              </select>
            </div>
            {selectedEvent && <div className="border-l-4 border-[var(--sky)] pl-4 lg:max-w-xs"><p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-[var(--cobalt)]">Selected event</p><p className="mt-2 font-display text-2xl text-[var(--midnight)]">{selectedEvent.title}</p><EventMeta event={selectedEvent} /></div>}
          </div>
        </section>

        {selectedEvent && (
          <section className="mt-10 border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-5 sm:p-7" aria-labelledby="roster-title">
            <div className="flex flex-col gap-5 border-b-2 border-[var(--ink)] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Staff view</p><h2 id="roster-title" className="mt-2 font-display text-3xl text-[var(--midnight)]">Event volunteer roster.</h2></div>
              <div className="flex flex-wrap gap-3"><button type="button" onClick={() => void loadEventRoster()} disabled={rosterLoading} className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--ink)] px-4 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--cream)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${rosterLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} /> Refresh</button><button type="button" onClick={() => void exportRosterCsv()} disabled={eventRoster.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--midnight)] px-4 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]"><Download aria-hidden="true" className="h-4 w-4" /> Export CSV</button></div>
            </div>
            {rosterError && <p role="alert" className="mt-5 border-l-4 border-red-700 bg-red-100 px-4 py-3 font-body text-sm text-red-950">{rosterError}</p>}
            {rosterLoading ? <p className="py-10 text-center font-body text-sm text-[var(--ink)]/65">Loading roster…</p> : eventRoster.length > 0 ? <ul className="grid gap-0 divide-y divide-[var(--ink)]/20 sm:grid-cols-2 sm:divide-x sm:divide-y-0">{eventRoster.map(({ signup, profile }) => <li key={signup.id} className="border-b border-[var(--ink)]/20 p-5 first:pt-5 sm:border-b-0 sm:even:border-l sm:last:border-b-0"><div className="flex items-start justify-between gap-4"><div><p className="font-body font-bold text-[var(--midnight)]">{profile?.fullName || 'Unknown volunteer'}</p><p className="mt-1 break-all font-body text-xs text-[var(--ink)]/60">{profile?.email || 'No email available'}</p><p className="mt-1 font-body text-[10px] text-[var(--ink)]/50">{profile?.memberCode || 'No member code'}</p></div><span className="font-body text-xs font-bold uppercase tracking-[0.12em] text-[var(--cobalt)]">{signup.status}</span></div><div className="mt-4 flex items-center justify-between font-body text-xs text-[var(--ink)]/60"><span>{signup.hours.toFixed(2)}h logged</span>{signup.checkedInAt && <span>{new Date(signup.checkedInAt).toLocaleTimeString()}</span>}</div></li>)}</ul> : <p className="py-10 text-center font-body text-sm text-[var(--ink)]/65">No volunteers are registered for this event yet.</p>}
          </section>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.9fr]">
          <section className="border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-5 sm:p-7" aria-labelledby="scanner-title">
            <div className="border-b-2 border-[var(--ink)] pb-5"><p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Step two</p><h2 id="scanner-title" className="mt-2 font-display text-3xl text-[var(--midnight)]">Scan a member code.</h2><p className="mt-2 font-body text-sm leading-6 text-[var(--ink)]/65">The webcam scanner loads only after a verified staff member activates it.</p></div>
            <div className="relative mt-6 flex aspect-square w-full items-center justify-center border-2 border-[var(--ink)]/20 bg-[var(--midnight)] p-4 sm:max-w-[420px]">
              {cameraActive ? <div id="qr-reader" className="h-full w-full" aria-label="Camera QR scanner" /> : <div className="max-w-xs text-center text-[var(--cream)]"><Camera aria-hidden="true" className="mx-auto h-10 w-10 text-[var(--sky)]" /><p className="mt-4 font-body text-sm leading-6 text-[var(--cream)]/75">Activate the webcam when you are ready to scan.</p></div>}
              {cameraLoading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--midnight)]/90 text-[var(--cream)]"><Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-[var(--sky)] motion-reduce:animate-none" /><p className="mt-3 font-body text-sm">Loading scanner…</p></div>}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:max-w-[420px]"><button type="button" onClick={() => { if (!selectedEventId) { setCheckinError('Select a check-in event first.'); return } setCameraError(''); setCheckinError(''); setCameraActive((current) => !current) }} disabled={cameraLoading} className={`inline-flex min-h-11 w-full items-center justify-center gap-2 px-5 py-3 font-body font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] ${cameraActive ? 'bg-red-800 text-[var(--cream)] hover:bg-red-900' : 'bg-[var(--midnight)] text-[var(--cream)] hover:bg-[var(--cobalt)]'} disabled:cursor-not-allowed disabled:opacity-50`}><Camera aria-hidden="true" className="h-4 w-4" /> {cameraActive ? 'Stop scanner' : 'Activate scanner'}</button><p className="font-body text-xs text-[var(--ink)]/55" aria-live="polite">Scanner status: {scannerState === 'active' ? 'ready' : scannerState === 'loading' ? 'loading' : scannerState === 'error' ? 'unavailable' : 'idle'}</p></div>
            {cameraError && <p role="alert" className="mt-4 border-l-4 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950 sm:max-w-[420px]">{cameraError}</p>}
          </section>

          <div className="space-y-10">
            <section className="border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-5 sm:p-7" aria-labelledby="manual-title">
              <div className="border-b-2 border-[var(--ink)] pb-5"><p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Fallback</p><h2 id="manual-title" className="mt-2 font-display text-3xl text-[var(--midnight)]">Use a member code.</h2></div>
              <label htmlFor="volunteer-search" className="mt-5 block font-body text-sm font-bold text-[var(--midnight)]">Search volunteer</label>
              <input id="volunteer-search" type="search" value={manualSearch} onChange={(event) => setManualSearch(event.target.value)} placeholder="Name, email, or member code" className="mt-2 min-h-11 w-full rounded-md border-2 border-[var(--ink)]/25 bg-[var(--cream)] px-4 py-3 font-body text-[var(--ink)] outline-none focus-visible:border-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)]" />
              {manualSearchLoading && <p className="mt-2 font-body text-xs text-[var(--ink)]/60">Searching volunteers…</p>}
              {manualSearchError && <p role="alert" className="mt-2 font-body text-xs text-red-800">{manualSearchError}</p>}
              {manualSearchResults.length > 0 && <ul className="mt-3 divide-y divide-[var(--ink)]/20 border-y border-[var(--ink)]/20">{manualSearchResults.map((profile) => <li key={profile.id}><button type="button" onClick={() => { setManualCode(profile.memberCode); setManualSearch(''); setManualSearchResults([]) }} className="min-h-11 w-full py-3 text-left font-body text-sm transition hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]"><span className="block font-bold text-[var(--midnight)]">{profile.fullName}</span><span className="mt-1 block text-xs text-[var(--ink)]/60">{profile.email} · {profile.memberCode}</span></button></li>)}</ul>}
              <form onSubmit={handleManualCheckIn} className="mt-6 border-t border-[var(--ink)]/20 pt-5"><label htmlFor="code-input" className="block font-body text-sm font-bold text-[var(--midnight)]">Volunteer member code</label><input id="code-input" type="text" value={manualCode} onChange={(event) => setManualCode(event.target.value.toUpperCase())} placeholder="POT-123456" required className="mt-2 min-h-11 w-full rounded-md border-2 border-[var(--ink)]/25 bg-[var(--cream)] px-4 py-3 font-body tracking-[0.12em] text-[var(--ink)] outline-none focus-visible:border-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)]" /><button type="submit" disabled={checkinLoading || !selectedEventId} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]">{checkinLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Search aria-hidden="true" className="h-4 w-4" />} Submit code</button></form>
            </section>

            <section className="border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-5 sm:p-7" aria-labelledby="active-title">
              <div className="flex items-end justify-between gap-4 border-b-2 border-[var(--ink)] pb-5"><div><p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Live view</p><h2 id="active-title" className="mt-2 font-display text-3xl text-[var(--midnight)]">Currently checked in.</h2></div><UserCheck aria-hidden="true" className="h-6 w-6 text-[var(--cobalt)]" /></div>
              {activeError && <p role="alert" className="mt-5 border-l-4 border-red-700 bg-red-100 px-4 py-3 font-body text-sm text-red-950">{activeError}</p>}
              {activeLoading ? <p className="py-8 text-center font-body text-sm text-[var(--ink)]/65">Loading active check-ins…</p> : activeCheckIns.length > 0 ? <ul className="divide-y divide-[var(--ink)]/20">{activeCheckIns.map((session) => <li key={session.sessionId} className="py-4"><div className="flex items-start justify-between gap-4"><div><p className="font-body text-sm font-bold text-[var(--midnight)]">{session.profile.fullName}</p><p className="mt-1 font-body text-xs text-[var(--ink)]/60">{session.profile.memberCode}</p></div><p className="text-right font-body text-xs text-[var(--ink)]/60">{events.find((event) => event.id === session.eventId)?.title ?? session.eventId}</p></div><div className="mt-3 flex items-center justify-between font-body text-xs text-[var(--ink)]/60"><span>In at {new Date(session.checkInTime).toLocaleTimeString()}</span><span>{session.hoursLogged.toFixed(2)}h logged</span></div></li>)}</ul> : <p className="py-8 font-body text-sm text-[var(--ink)]/65">No volunteers are currently checked in.</p>}
            </section>

            <section aria-live="polite" className="min-h-[220px] border-2 border-[var(--ink)]/25 bg-[var(--paper)] p-5 sm:p-7">
              {recentScan ? <div className="flex min-h-[180px] flex-col justify-between"><div><CheckCircle2 aria-hidden="true" className="h-8 w-8 text-[var(--cobalt)]" /><p className="mt-5 font-body text-xs font-bold uppercase tracking-[0.2em] text-[var(--cobalt)]">{recentScan.action === 'checkedIn' ? 'Checked in' : 'Checked out'} successfully</p><h2 className="mt-2 font-display text-3xl text-[var(--midnight)]">{recentScan.profile.fullName}</h2><p className="mt-2 font-body text-sm text-[var(--ink)]/65">Member {recentScan.profile.memberCode}</p><p className="mt-3 font-body text-sm text-[var(--ink)]/65">{recentScan.action === 'checkedIn' ? `Checked in at ${new Date(recentScan.checkInTime).toLocaleTimeString()}` : `Checked out at ${new Date(recentScan.checkOutTime || '').toLocaleTimeString()}, ${recentScan.hoursLogged.toFixed(2)}h logged`}</p></div><button type="button" onClick={() => setRecentScan(null)} className="mt-6 inline-flex min-h-11 w-full items-center justify-center bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]">Next scan</button></div> : checkinError ? <div className="flex min-h-[180px] flex-col justify-between"><div><AlertCircle aria-hidden="true" className="h-8 w-8 text-red-800" /><p className="mt-5 font-body text-xs font-bold uppercase tracking-[0.2em] text-red-800">Scan error</p><p role="alert" className="mt-2 font-body text-sm leading-6 text-red-950">{checkinError}</p></div><button type="button" onClick={() => setCheckinError('')} className="mt-6 inline-flex min-h-11 w-full items-center justify-center border-2 border-[var(--ink)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]">Dismiss error</button></div> : <div className="flex min-h-[180px] flex-col items-center justify-center text-center"><ShieldCheck aria-hidden="true" className="h-9 w-9 text-[var(--cobalt)]" /><p className="mt-4 font-body text-xs font-bold uppercase tracking-[0.2em] text-[var(--cobalt)]">Ready for check-in</p><p className="mt-2 max-w-xs font-body text-sm leading-6 text-[var(--ink)]/65">Activate the webcam or enter a member code to record attendance.</p></div>}
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
