'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import Link from 'next/link'
import { Event } from '@/data/events'
import { volunteerService, VolunteerProfile, VolunteerSignup } from '@/lib/volunteerService'
import { supabase } from '@/lib/supabaseClient'
import { MemberCardContent } from '@/components/MemberCard'
import {
  Heart,
  Sparkles,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  LogOut,
  User,
  QrCode,
  Award,
  Clock8,
  Camera,
  Mail,
  Lock,
  Loader2,
  Wrench,
  HandshakeIcon,
  Users,
  Download,
  Printer as PrintIcon,
  Hourglass,
  X,
} from 'lucide-react'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

const cardColorsTailwind = [
  'bg-blue-900/40 border-blue-800/60',
  'bg-purple-900/40 border-purple-800/60',
  'bg-emerald-900/40 border-emerald-800/60',
]

// Custom volunteer descriptions per event ID
const volunteerDescriptions: Record<string, string> = {
  'career-panel-granada':
    'Help us manage people and keep the event running smoothly, such as checking people in, directing attendees, and assisting Pillars of Tech staff with whatever they need to ensure a successful panel.',
}

const getVolunteerDescription = (event: Event) =>
  volunteerDescriptions[event.id] ??
  `Help us run the ${event.title} event! Volunteers assist with setup, greeting attendees, managing activity booths, and supporting the Pillars of Tech team throughout the program.`

export default function VolunteerPortalPage() {
  const router = useRouter()
  const [user, setUser] = useState<VolunteerProfile | null>(null)
  const [signups, setSignups] = useState<VolunteerSignup[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  // Auth
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Event signup
  const [signingUpEventId, setSigningUpEventId] = useState<string | null>(null)
  
  // Track if user just signed up to avoid auth state callback interference
  const [skipAuthCallback, setSkipAuthCallback] = useState(false)
  const [showMemberCard, setShowMemberCard] = useState(false)

  const formRef = useRef<HTMLDivElement>(null)

  const loadVolunteerSession = async () => {
    const profile = await volunteerService.getCurrentUser()
    if (profile) {
      if (profile.role === 'staff') {
        router.replace('/volunteer/checkin')
        return profile
      }
      setUser(profile)
      setSignups(await volunteerService.getMySignups(profile.id))
      return profile
    }
    setUser(null)
    setSignups([])
    return null
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') === 'auth') {
        setAuthError('Google sign-in failed. Please try again.')
      }

      await volunteerService.handleAuthCallback()

      if (!mounted) return

      await loadVolunteerSession()

      try {
        const res = await fetch('/api/events')
        const data = await res.json()
        if (mounted && Array.isArray(data)) setEvents(data)
      } catch (err) {
        console.error('Error fetching events:', err)
      }

      if (mounted) setLoading(false)
    }

    init()

    if (!supabase) return () => { mounted = false }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted || event !== 'SIGNED_IN') return
      // Skip if user was just set by signup form to avoid race conditions
      if (skipAuthCallback) {
        setSkipAuthCallback(false)
        return
      }
      await loadVolunteerSession()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const upcomingEvents = events.filter((e) => e.status === 'upcoming')

  const totalHours = signups
    .filter((s) => s.status === 'attended')
    .reduce((sum, s) => sum + s.hours, 0)

  const getBadgeTier = (hours: number) => {
    if (hours >= 30) return { name: 'Gold Champion', color: 'text-amber-400 border-amber-400 bg-amber-400/10' }
    if (hours >= 10) return { name: 'Silver Leader', color: 'text-slate-300 border-slate-300 bg-slate-300/10' }
    return { name: 'Bronze Helper', color: 'text-orange-400 border-orange-400 bg-orange-400/10' }
  }

  const badge = getBadgeTier(totalHours)

  const handleToggleExpand = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      if (authTab === 'signin') {
        const profile = await volunteerService.signInWithEmail(email, password)
        setUser(profile)
        setSignups(await volunteerService.getMySignups(profile.id))
      } else {
        if (!fullName) throw new Error('Please enter your full name.')
        const profile = await volunteerService.signUpWithEmail(email, password, fullName)
        setUser(profile)
        setSignups([])
        // Skip auth callback since we just set the user
        setSkipAuthCallback(true)
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleSSO = async () => {
    setAuthLoading(true)
    setAuthError('')
    try {
      await volunteerService.signInWithGoogle()
    } catch (err: any) {
      setAuthError(err.message || 'Google SSO failed.')
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    await volunteerService.signOut()
    setUser(null)
    setSignups([])
  }

  const handlePrintCard = () => {
    const printWindow = window.open('', '', 'width=600,height=800')
    if (printWindow && user) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>POT Member Card - ${user.fullName}</title>
          <style>
            body { margin: 0; padding: 20px; background: #0f172a; font-family: Arial, sans-serif; }
            @media print { body { padding: 0; } }
            .print-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div style="width: 100%; max-width: 500px; background: linear-gradient(to bottom right, #2563eb, #9333ea); border-radius: 24px; padding: 32px; text-align: center; color: white; box-shadow: 0 20px 25px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.2);">
              <div style="font-size: 28px; font-weight: bold; margin-bottom: 8px;">POT</div>
              <div style="font-size: 12px; letter-spacing: 2px; opacity: 0.9; margin-bottom: 20px;">Pillars of Tech - Volunteer Member Card</div>
              
              <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                <div style="font-size: 12px; opacity: 0.75; margin-bottom: 4px;">NAME</div>
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 24px;">${user.fullName}</div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                  <div>
                    <div style="font-size: 12px; opacity: 0.75; margin-bottom: 4px;">MEMBER CODE</div>
                    <div style="font-size: 18px; font-weight: bold; letter-spacing: 2px;">${user.memberCode}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 12px; opacity: 0.75; margin-bottom: 4px;">STATUS</div>
                    <div style="font-size: 16px; font-weight: bold;">🟢 Active</div>
                  </div>
                </div>
                
                <div style="font-size: 12px; opacity: 0.6; word-break: break-all;">${user.email}</div>
              </div>
              
              <div style="background: white; padding: 16px; border-radius: 16px; display: flex; justify-content: center; margin-bottom: 24px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(user.memberCode)}" alt="QR Code" width="160" height="160" style="display: block;" />
              </div>
              
              <div style="font-size: 12px; opacity: 0.75; line-height: 1.5;">Show this card at event check-in to log your volunteer hours and earn badges!</div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const calculateTimeUntilEvent = (eventDate: string): { days: number; hours: number; minutes: number } => {
    const event = new Date(eventDate)
    const now = new Date()
    const diff = event.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return { days: Math.max(0, days), hours: Math.max(0, hours), minutes: Math.max(0, minutes) }
  }

  const upcomingSignups = signups.filter(s => s.status === 'registered')

  const handleRegisterForEvent = async (event: Event) => {
    if (!user) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    setSigningUpEventId(event.id)
    try {
      const newSignup = await volunteerService.registerForEvent(user.id, event.id, event.title)
      setSignups((prev) => [...prev.filter((s) => s.eventId !== event.id), newSignup])
    } catch (err) {
      console.error('Error signing up for event:', err)
    } finally {
      setSigningUpEventId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
        <p className={`${spaceGrotesk.className} text-blue-200 text-lg`}>Loading Volunteer Portal... (If it does not load within 10 seconds, please refresh the page.)</p>
      </div>
    )
  }

  /* ─────────────────────────────────────────────
     LOGGED-IN DASHBOARD VIEW
  ───────────────────────────────────────────── */
  if (user) {
    return (
      <main className="min-h-screen pt-24 pb-20 bg-primary text-white relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-5"
          >
            {/* LEFT: Profile + History */}
            <div className="lg:col-span-1 space-y-8">
              {/* Profile Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center border border-accent/30">
                      <User className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h2 className={`${fredoka.className} text-xl font-bold`}>{user.fullName}</h2>
                      <span className={`${spaceGrotesk.className} text-xs text-blue-300`}>{user.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    title="Log Out"
                    className="p-2 bg-white/5 hover:bg-rose-500/20 text-blue-200 hover:text-rose-400 border border-white/10 rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-black/35 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <Clock8 className="w-5 h-5 text-accent mb-2" />
                    <span className={`${spaceGrotesk.className} text-2xl font-black`}>{totalHours}</span>
                    <span className={`${spaceGrotesk.className} text-[10px] text-blue-300 font-bold uppercase tracking-wider mt-1`}>Hours Logged</span>
                  </div>
                  <div className={`border rounded-2xl p-4 flex flex-col items-center justify-center text-center ${badge.color}`}>
                    <Award className="w-5 h-5 mb-2" />
                    <span className={`${spaceGrotesk.className} text-xs font-black`}>{badge.name}</span>
                    <span className={`${spaceGrotesk.className} text-[10px] opacity-75 font-bold uppercase tracking-wider mt-2.5`}>Badge Tier</span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center text-center mb-6">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(user.memberCode)}`}
                    alt="Volunteer Member Code QR"
                    width={180}
                    height={180}
                    className="mx-auto select-none"
                  />
                  <div className={`${spaceGrotesk.className} text-slate-800 font-bold text-sm tracking-widest mt-4 uppercase border-t border-slate-100 pt-3 w-full`}>
                    {user.memberCode}
                  </div>
                  <span className={`${spaceGrotesk.className} text-[10px] text-slate-400 font-semibold mt-1`}>
                    Show this QR code at event check-in
                  </span>
                </div>

                <div className="space-y-3">
                  {user.role === 'staff' && (
                    <Link
                      href="/volunteer/checkin"
                      className={`${spaceGrotesk.className} flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/10 hover:scale-[1.01]`}
                    >
                      <Camera className="w-5 h-5 animate-pulse" />
                      Open Staff Scan Portal
                    </Link>
                  )}
                  <button
                    onClick={() => setShowMemberCard(true)}
                    className={`${spaceGrotesk.className} flex items-center justify-center gap-2 w-full py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-2xl font-bold transition-all`}
                  >
                    <Download className="w-4 h-4" />
                    Print Member Card
                  </button>
                </div>
              </div>

              {/* Volunteer hours are recorded by staff check-in only */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h3 className={`${fredoka.className} text-lg font-bold mb-4`}>Volunteer Hours</h3>
                <p className={`${spaceGrotesk.className} text-sm text-blue-300 leading-6`}>For accuracy and fraud prevention, hours are logged through the staff check-in portal only. Please show your QR code at the event entrance.</p>
              </div>

              {/* History */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h3 className={`${fredoka.className} text-lg font-bold mb-4`}>My Volunteering History</h3>
                {signups.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {signups.map((signup) => {
                      const isAttended = signup.status === 'attended'
                      const isRegistered = signup.status === 'registered'
                      return (
                        <div key={signup.id} className="bg-black/35 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                          <div className="max-w-[70%]">
                            <h4 className={`${spaceGrotesk.className} text-sm font-bold text-white truncate`}>{signup.eventTitle}</h4>
                            {isAttended && signup.checkedInAt && (
                              <span className={`${spaceGrotesk.className} text-[10px] text-blue-300 block mt-1`}>
                                Checked in {new Date(signup.checkedInAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${isAttended ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : isRegistered ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                              {signup.status}
                            </span>
                            {isAttended && (
                              <span className={`${spaceGrotesk.className} text-xs font-bold text-blue-100 block mt-1`}>+{signup.hours} hrs</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-blue-300/60 border border-dashed border-white/5 rounded-2xl">
                    <QrCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className={`${spaceGrotesk.className} text-xs font-semibold`}>No event history yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Events */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Registered Events Countdown */}
              {upcomingSignups.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-3xl p-6 md:p-8"
                >
                  <h3 className={`${fredoka.className} text-2xl font-bold mb-4 flex items-center gap-2`}>
                    <Hourglass className="w-6 h-6 text-emerald-400" />
                    Your Upcoming Volunteering
                  </h3>
                  <div className="space-y-3">
                    {upcomingSignups.slice(0, 3).map(signup => {
                      const event = events.find(e => e.id === signup.eventId)
                      if (!event) return null
                      const timeLeft = calculateTimeUntilEvent(event.date)
                      return (
                        <div key={signup.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className={`${spaceGrotesk.className} font-bold text-white`}>{event.title}</h4>
                            <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
                              Registered ✓
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-blue-200 mb-3">
                            <Calendar className="w-4 h-4" />
                            {event.date} • {event.time}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-black/30 rounded-lg p-2 text-center">
                              <div className={`${fredoka.className} text-xl font-bold text-emerald-400`}>{timeLeft.days}</div>
                              <div className={`${spaceGrotesk.className} text-xs text-blue-300`}>Days</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-2 text-center">
                              <div className={`${fredoka.className} text-xl font-bold text-emerald-400`}>{timeLeft.hours}</div>
                              <div className={`${spaceGrotesk.className} text-xs text-blue-300`}>Hours</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-2 text-center">
                              <div className={`${fredoka.className} text-xl font-bold text-emerald-400`}>{timeLeft.minutes}</div>
                              <div className={`${spaceGrotesk.className} text-xs text-blue-300`}>Mins</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              <div>
                <h2 className={`${fredoka.className} text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200`}>\n                  Upcoming Events to Volunteer For
                </h2>
                <p className={`${spaceGrotesk.className} text-blue-200 mt-2`}>
                  Click "Sign Up to Volunteer" on any event below to add it to your roster!
                </p>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {upcomingEvents.map((event, idx) => {
                    const colorClass = cardColorsTailwind[idx % cardColorsTailwind.length]
                    const isExpanded = expandedEvents.has(event.id)
                    const isRegistered = signups.some((s) => s.eventId === event.id)
                    const isAttended = signups.some((s) => s.eventId === event.id && s.status === 'attended')

                    return (
                      <div key={event.id} className={`border-2 rounded-3xl p-7 shadow-lg flex flex-col gap-5 transition-all duration-300 ${colorClass}`}>
                        <div>
                          <span className="inline-block bg-accent/20 border border-accent/30 text-blue-300 font-bold px-3 py-1 rounded-full text-xs mb-4 uppercase tracking-wider">
                            Upcoming Event
                          </span>
                          <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-3`}>{event.title}</h3>
                          <p className={`${spaceGrotesk.className} text-blue-100/90 text-sm leading-relaxed`}>
                            {getVolunteerDescription(event)}
                          </p>
                        </div>

                        {/* Accordion */}
                        <div>
                          <button
                            onClick={() => handleToggleExpand(event.id)}
                            className={`${spaceGrotesk.className} flex items-center justify-between w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-blue-200 transition-all`}
                          >
                            <span>See Event Details</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-accent" /> : <ChevronDown className="w-4 h-4 text-accent" />}
                          </button>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className={`mt-3 p-4 bg-black/20 border border-white/5 rounded-xl space-y-2 ${spaceGrotesk.className} text-xs text-blue-200`}>
                                  <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-accent flex-shrink-0" /><span><strong>Date:</strong> {event.date}</span></div>
                                  <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-accent flex-shrink-0" /><span><strong>Time:</strong> {event.time}</span></div>
                                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0" /><span><strong>Location:</strong> {event.location}</span></div>
                                  {event.description && (
                                    <div className="pt-2.5 border-t border-white/5 mt-2 text-blue-100/80 leading-relaxed">{event.description}</div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {isAttended ? (
                          <button disabled className={`${spaceGrotesk.className} w-full py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold flex items-center justify-center gap-2`}>
                            <CheckCircle2 className="w-4 h-4" /> Attended Event
                          </button>
                        ) : isRegistered ? (
                          <button disabled className={`${spaceGrotesk.className} w-full py-3 bg-accent/20 text-blue-300 border border-accent/30 rounded-xl font-bold flex items-center justify-center gap-2`}>
                            <CheckCircle2 className="w-4 h-4" /> Registered ✓
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRegisterForEvent(event)}
                            disabled={signingUpEventId === event.id}
                            className={`${spaceGrotesk.className} w-full py-3 bg-accent hover:bg-blue-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2`}
                          >
                            {signingUpEventId === event.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign Up to Volunteer'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                  <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-pulse" />
                  <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-2`}>No Events Scheduled Yet</h3>
                  <p className={`${spaceGrotesk.className} text-blue-200 max-w-md mx-auto px-4`}>Check back soon for upcoming volunteer opportunities!</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Member Card Modal */}
        <AnimatePresence>
          {showMemberCard && user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMemberCard(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-md w-full"
              >
                <div className="relative">
                  <button
                    onClick={() => setShowMemberCard(false)}
                    className="absolute -top-4 -right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-all"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <MemberCardContent profile={user} />
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handlePrintCard}
                      className={`${spaceGrotesk.className} flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all`}
                    >
                      <PrintIcon className="w-4 h-4" />
                      Print
                    </button>
                    <button
                      onClick={() => {
                        const html = document.getElementById('member-card')?.innerHTML
                        if (html) {
                          const link = document.createElement('a')
                          const blob = new Blob([`<html><body style="margin:0; padding:20px; background:#0f172a;">${html}</body></html>`], { type: 'text/html' })
                          link.href = URL.createObjectURL(blob)
                          link.download = `POT-MemberCard-${user.fullName}.html`
                          link.click()
                        }
                      }}
                      className={`${spaceGrotesk.className} flex-1 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all`}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    )
  }

  /* ─────────────────────────────────────────────
     LOGGED-OUT PUBLIC PAGE
  ───────────────────────────────────────────── */
  return (
    <main className="min-h-screen pt-24 pb-20 bg-primary text-white relative overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-20">

        {/* ── HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center space-x-2 mb-6 bg-white/5 border border-white/10 rounded-full px-5 py-2">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400 animate-pulse" />
            <span className={`${spaceGrotesk.className} text-sm font-bold text-blue-200 tracking-wide uppercase`}>Event Volunteering</span>
          </div>

          <h1 className={`${fredoka.className} text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-accent to-purple-400 pb-4`}>
            Volunteer with Pillars of Tech
          </h1>
          <p className={`${spaceGrotesk.className} text-xl text-blue-100 max-w-2xl mx-auto opacity-90 leading-relaxed`}>
            Volunteer at our events—the easiest way to get involved with Pillars of Tech, without the commitment!
          </p>
        </motion.div>

        {/* ── PROGRAM DESCRIPTION ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl"
        >
          <h2 className={`${fredoka.className} text-3xl font-bold text-white mb-6`}>What Is This?</h2>

          <p className={`${spaceGrotesk.className} text-blue-100 leading-relaxed mb-8`}>
            Thank you for volunteering your time to help bring our events to life! This form adds you to our{' '}
            <strong className="text-white">Event Volunteer Roster</strong>.
          </p>

          <p className={`${spaceGrotesk.className} text-blue-100 leading-relaxed mb-8`}>
            By filling this out, you&apos;re joining our go-to list of extra hands for upcoming workshops, panels, and community events.{' '}
            <strong className="text-white">There is no long-term commitment required</strong>&mdash;whenever an event is coming up, we will reach out to this network with the specific dates and times so you can pitch in whenever your schedule allows.
          </p>

          {/* Callouts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-300" />
              </div>
              <p className={`${spaceGrotesk.className} text-sm text-blue-100 leading-relaxed`}>
                <strong className="text-white block mb-1">No experience needed!</strong>
                No prior tech or volunteering experience is necessary. We'll provide any quick training right at the event.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-purple-300" />
              </div>
              <p className={`${spaceGrotesk.className} text-sm text-blue-100 leading-relaxed`}>
                <strong className="text-white block mb-1">Help around the venue</strong>
                Pitch in with quick setup before the event or help pack things away at the end.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-300" />
              </div>
              <p className={`${spaceGrotesk.className} text-sm text-blue-100 leading-relaxed`}>
                <strong className="text-white block mb-1">Welcome people</strong>
                Greet attendees, check names at the door, or hand out event materials.
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex gap-3 items-start">
              <HandshakeIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <p className={`${spaceGrotesk.className} text-sm text-blue-100 leading-relaxed`}>
                <strong className="text-white">Be a flexible team player:</strong>{' '}
                Help guide traffic, assist presenters, and float around to keep things running smoothly.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── UPCOMING EVENTS ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className={`${fredoka.className} text-4xl font-bold text-white mb-3`}>Upcoming Events</h2>
          <p className={`${spaceGrotesk.className} text-blue-200 mb-8`}>
            Sign up below to be added to the volunteer roster for any of these events.
          </p>

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event, idx) => {
                const colorClass = cardColorsTailwind[idx % cardColorsTailwind.length]
                const isExpanded = expandedEvents.has(event.id)

                return (
                  <motion.div
                    key={event.id}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    className={`border-2 rounded-3xl p-7 shadow-lg flex flex-col gap-5 transition-all duration-300 ${colorClass}`}
                  >
                    <div>
                      <span className="inline-block bg-accent/20 border border-accent/30 text-blue-300 font-bold px-3 py-1 rounded-full text-xs mb-4 uppercase tracking-wider">
                        Upcoming
                      </span>
                      <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-3`}>{event.title}</h3>
                      <p className={`${spaceGrotesk.className} text-blue-100/90 text-sm leading-relaxed`}>
                        {getVolunteerDescription(event)}
                      </p>
                    </div>

                    {/* Accordion */}
                    <div>
                      <button
                        onClick={() => handleToggleExpand(event.id)}
                        className={`${spaceGrotesk.className} flex items-center justify-between w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-blue-200 transition-all`}
                      >
                        <span>See Event Details</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-accent" /> : <ChevronDown className="w-4 h-4 text-accent" />}
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className={`mt-3 p-4 bg-black/20 border border-white/5 rounded-xl space-y-2 ${spaceGrotesk.className} text-xs text-blue-200`}>
                              <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-accent flex-shrink-0" /><span><strong>Date:</strong> {event.date}</span></div>
                              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-accent flex-shrink-0" /><span><strong>Time:</strong> {event.time}</span></div>
                              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0" /><span><strong>Location:</strong> {event.location}</span></div>
                              {event.description && (
                                <div className="pt-2.5 border-t border-white/5 mt-2 text-blue-100/80 leading-relaxed">{event.description}</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* CTA — scroll to sign-up form */}
                    <button
                      onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className={`${spaceGrotesk.className} w-full py-3 bg-accent hover:bg-blue-600 text-white rounded-xl font-bold transition-all`}
                    >
                      Sign Up to Volunteer
                    </button>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/5 border border-dashed border-white/10 rounded-3xl">
              <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-pulse" />
              <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-2`}>No Events Scheduled Yet</h3>
              <p className={`${spaceGrotesk.className} text-blue-200`}>Check back soon for upcoming volunteer opportunities!</p>
            </div>
          )}
        </motion.div>

        {/* ── SIGN-UP / LOGIN FORM ── */}
        <motion.div
          ref={formRef}
          id="volunteer-signup"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto scroll-mt-28"
        >
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl">
            {volunteerService.isMockMode() && (
              <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-2.5 text-xs text-blue-200">
                <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Mock Mode Active:</strong> No Supabase project detected. Data saves locally so you can test instantly.
                </div>
              </div>
            )}

            <div className="text-center mb-8">
              <Heart className="w-10 h-10 text-rose-500 fill-rose-500 mx-auto mb-4 animate-pulse" />
              <h2 className={`${fredoka.className} text-3xl font-bold`}>Join the Roster</h2>
              <p className={`${spaceGrotesk.className} text-blue-200 mt-2 text-sm`}>
                Create an account to get added to our volunteer list and receive a QR check-in code.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl mb-6">
              {(['signin', 'signup'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAuthTab(tab)}
                  className={`${spaceGrotesk.className} flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${authTab === tab ? 'bg-accent text-white' : 'text-blue-200 hover:text-white'}`}
                >
                  {tab === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Google SSO */}
            <button
              type="button"
              onClick={handleGoogleSSO}
              disabled={authLoading}
              className={`${spaceGrotesk.className} w-full py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2.5 mb-6 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign in with Google
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-[1px] bg-white/10 flex-grow" />
              <span className={`${spaceGrotesk.className} text-xs text-blue-300 font-bold uppercase tracking-wider`}>or email</span>
              <div className="h-[1px] bg-white/10 flex-grow" />
            </div>

            <form onSubmit={handleAuthSubmit} className={`space-y-4 ${spaceGrotesk.className}`}>
              {authTab === 'signup' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-name" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-accent" /> Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-accent" /> Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="auth-pw" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-accent" /> Password
                </label>
                <input
                  id="auth-pw"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
              </div>

              {authError && (
                <div className="text-rose-400 text-xs font-bold bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-accent hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {authLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : authTab === 'signin' ? (
                  'Sign In'
                ) : (
                  'Sign Up & Join the Roster'
                )}
              </button>
            </form>
          </div>
        </motion.div>

      </div>
    </main>
  )
}
