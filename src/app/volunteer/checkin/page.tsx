'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import Link from 'next/link'
import { Html5Qrcode } from 'html5-qrcode'
import { volunteerService, VolunteerProfile, VolunteerSignup } from '@/lib/volunteerService'
import { Event } from '@/data/events'
import { 
  Camera, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Calendar,
  Clock,
  UserCheck,
  RefreshCw,
  LogOut,
  Settings,
  Shield,
  User
} from 'lucide-react'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function CheckinPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Scanner state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scannerInstance, setScannerInstance] = useState<Html5Qrcode | null>(null)

  // Scan result state
  const [recentScan, setRecentScan] = useState<{ profile: VolunteerProfile, signup: VolunteerSignup } | null>(null)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinError, setCheckinError] = useState('')

  // Manual code input state
  const [manualCode, setManualCode] = useState('')

  // Role management state
  const [allProfiles, setAllProfiles] = useState<VolunteerProfile[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)

  const qrReaderRef = useRef<HTMLDivElement>(null)
  const beepPlayTimeoutRef = useRef<any>(null)

  // Programmatic synthesizer check-in beep
  const playSuccessBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5 pitch
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime)
      
      oscillator.start()
      // Decay sound
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
      oscillator.stop(audioCtx.currentTime + 0.35)
    } catch (e) {
      console.warn('Audio beep failed (waiting for user interaction):', e)
    }
  }

  // Verify staff access and load upcoming events
  useEffect(() => {
    let mounted = true

    const init = async () => {
      await volunteerService.handleAuthCallback()
      const profile = await volunteerService.getCurrentUser()

      if (!mounted) return

      if (!profile || profile.role !== 'staff') {
        router.replace('/volunteer')
        return
      }

      try {
        const res = await fetch('/api/events')
        const data = await res.json()
        if (mounted && Array.isArray(data)) {
          setEvents(data)
          const upcoming = data.filter((e: Event) => e.status === 'upcoming')
          if (upcoming.length > 0) {
            setSelectedEventId(upcoming[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch events:', err)
      }

      if (mounted) setLoading(false)
    }

    init()

    return () => {
      mounted = false
    }
  }, [router])

  // Start scanner when cameraActive is true and an event is selected
  useEffect(() => {
    if (!cameraActive || !selectedEventId) {
      // Stop scanner if active
      if (scannerInstance) {
        if (scannerInstance.isScanning) {
          scannerInstance.stop().then(() => {
            scannerInstance.clear()
            setScannerInstance(null)
          }).catch(console.error)
        } else {
          scannerInstance.clear()
          setScannerInstance(null)
        }
      }
      return
    }

    // Give react time to mount the qr-reader div element
    const timer = setTimeout(() => {
      const qrCodeId = 'qr-reader'
      const html5QrCode = new Html5Qrcode(qrCodeId)
      
      html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7
            return { width: size, height: size }
          }
        },
        async (decodedText) => {
          // Success callback
          handleCodeScan(decodedText)
        },
        () => {
          // Silent scan failure per frame
        }
      )
      .then(() => {
        setScannerInstance(html5QrCode)
        setCameraError('')
      })
      .catch(err => {
        console.error('Camera start failed:', err)
        setCameraError('Camera access denied or device busy.')
        setCameraActive(false)
      })
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [cameraActive, selectedEventId])

  // Stop scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerInstance && scannerInstance.isScanning) {
        scannerInstance.stop().catch(console.error)
      }
    }
  }, [scannerInstance])

  const handleCodeScan = async (code: string) => {
    // Prevent double triggers during active checkin or shown result
    if (checkinLoading || recentScan) return

    setCheckinLoading(true)
    setCheckinError('')
    
    try {
      const result = await volunteerService.checkInVolunteer(code, selectedEventId)
      playSuccessBeep()
      setRecentScan(result)
      
      // Auto-clear result after 4 seconds to enable continuous scanning
      if (beepPlayTimeoutRef.current) clearTimeout(beepPlayTimeoutRef.current)
      beepPlayTimeoutRef.current = setTimeout(() => {
        setRecentScan(null)
      }, 4000)
    } catch (err: any) {
      console.error(err)
      setCheckinError(err.message || 'Check-in failed. Check member code.')
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode || !selectedEventId) return
    handleCodeScan(manualCode)
    setManualCode('')
  }

  const loadAllProfiles = async () => {
    setSettingsLoading(true)
    const profiles = await volunteerService.getAllProfiles()
    setAllProfiles(profiles)
    setSettingsLoading(false)
  }

  const handleUpdateRole = async (userId: string, newRole: 'volunteer' | 'staff') => {
    const result = await volunteerService.updateUserRole(userId, newRole)
    if (result) {
      setAllProfiles(allProfiles.map(p => p.id === userId ? result : p))
    }
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await volunteerService.signOut()
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6">
        <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
        <p className={`${spaceGrotesk.className} text-blue-200 text-lg`}>Loading Staff Scanner... (If it does not load within 10 seconds, please refresh the page.)</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen pt-24 pb-20 bg-primary text-white relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Header navigation */}
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/volunteer"
            onClick={() => setCameraActive(false)}
            className={`${spaceGrotesk.className} text-sm font-bold text-blue-200 hover:text-white transition-colors flex items-center gap-2 group`}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volunteer Portal
          </Link>
          <div className="flex items-center gap-3">
  <button
    onClick={() => {
      setShowSettings(!showSettings)
      if (!showSettings) loadAllProfiles()
    }}
    className={`${spaceGrotesk.className} px-3 py-1 bg-blue-500/10 border border-blue-500/25 rounded-full text-xs font-bold text-blue-300 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5`}
  >
    <Settings className="w-3.5 h-3.5" />
    Staff Settings
  </button>

  <button
    onClick={handleLogout}
    className={`${spaceGrotesk.className} px-3 py-1 bg-rose-500/10 border border-rose-500/25 rounded-full text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5`}
  >
    <LogOut className="w-3.5 h-3.5" />
    Log Out
  </button>

  <span className={`${spaceGrotesk.className} px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full text-xs font-bold text-emerald-400 flex items-center gap-1.5`}>
    <Shield className="w-3.5 h-3.5" />
    Staff Mode
  </span>
</div>
        </div>

        <div className="text-center mb-8">
          <h1 className={`${fredoka.className} text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-accent to-purple-400 pb-2`}>
            Webcam Attendance Check-In
          </h1>
          <p className={`${spaceGrotesk.className} text-blue-200`}>
            Scan volunteer QR codes or enter member codes to log arrival and assign hours.
          </p>
        </div>
<AnimatePresence>
  {showSettings && (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 mb-8"
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className={`${fredoka.className} text-2xl font-bold flex items-center gap-2`}>
            <Settings className="w-5 h-5 text-accent" />
            Staff Settings
          </h2>
          <p className={`${spaceGrotesk.className} text-sm text-blue-200`}>
            Manage who is staff and who is a volunteer.
          </p>
        </div>

        <button
          onClick={loadAllProfiles}
          disabled={settingsLoading}
          className={`${spaceGrotesk.className} px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2`}
        >
          <RefreshCw className={`w-4 h-4 ${settingsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {settingsLoading ? (
        <div className="py-8 flex items-center justify-center text-blue-200">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading users...
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {allProfiles.map(profile => (
            <div
              key={profile.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-200" />
                </div>

                <div>
                  <p className={`${spaceGrotesk.className} font-bold text-white`}>
                    {profile.fullName}
                  </p>
                  <p className={`${spaceGrotesk.className} text-xs text-blue-200`}>
                    {profile.email}
                  </p>
                  <p className={`${spaceGrotesk.className} text-[10px] text-slate-400 mt-1`}>
                    {profile.memberCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`${spaceGrotesk.className} px-3 py-1 rounded-full text-xs font-bold ${
                    profile.role === 'staff'
                      ? 'bg-blue-500/10 text-blue-300 border border-blue-500/25'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                  }`}
                >
                  {profile.role}
                </span>

                <select
                  value={profile.role}
                  onChange={(e) =>
                    handleUpdateRole(
                      profile.id,
                      e.target.value as 'volunteer' | 'staff'
                    )
                  }
                  className={`${spaceGrotesk.className} bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent`}
                >
                  <option value="volunteer">Volunteer</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
          ))}

          {allProfiles.length === 0 && (
            <div className={`${spaceGrotesk.className} py-8 text-center text-blue-200 border border-dashed border-white/10 rounded-2xl`}>
              No profiles found.
            </div>
          )}
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>
        {/* 1. SELECT EVENT DROPDOWN */}
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-grow">
            <label htmlFor="event-select" className={`${spaceGrotesk.className} text-xs font-bold text-blue-200 uppercase tracking-wide block mb-2`}>
              Check-in Event
            </label>
            <select
              id="event-select"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value)
                setCameraActive(false) // stop camera when switching events
              }}
              className={`${spaceGrotesk.className} w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-accent appearance-none`}
            >
              <option value="" disabled>-- Select an Event --</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.title} ({event.status})</option>
              ))}
            </select>
          </div>
          {selectedEvent && (
            <div className={`p-4 bg-black/35 border border-white/5 rounded-2xl md:max-w-xs text-xs space-y-1.5 text-blue-200 ${spaceGrotesk.className}`}>
              <div className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-2 text-accent" />
                <span>{selectedEvent.date}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-2 text-accent" />
                <span>{selectedEvent.time}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* WEBCAM SCANNER CARD */}
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
            <h2 className={`${fredoka.className} text-xl font-bold mb-4 flex items-center gap-2`}>
              <Camera className="w-5 h-5 text-accent" /> QR Code Scanner
            </h2>

            {/* Video Container */}
            <div className="relative w-full max-w-[280px] aspect-square rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden mb-6">
              
              {cameraActive ? (
                <>
                  <div id="qr-reader" className="w-full h-full"></div>
                  
                  {/* Glowing Laser Scan Line */}
                  <motion.div 
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2.5, ease: 'easeInOut' }}
                    className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10b981] pointer-events-none"
                  />
                  
                  {/* Scan boundary indicators */}
                  <div className="absolute inset-5 border-2 border-white/10 pointer-events-none rounded-xl" />
                </>
              ) : (
                <div className="text-center p-6 space-y-4 text-blue-300">
                  <Camera className="w-12 h-12 mx-auto opacity-35" />
                  <p className={`${spaceGrotesk.className} text-xs font-semibold px-4`}>
                    Scanner is currently idle. Click below to start the webcam.
                  </p>
                </div>
              )}

              {/* Loader */}
              {checkinLoading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <RefreshCw className="w-10 h-10 text-accent animate-spin" />
                </div>
              )}
            </div>

            {/* Toggle Button */}
            <button
              onClick={() => {
                if (!selectedEventId) {
                  setCheckinError('Please select a check-in event first.')
                  return
                }
                setCameraActive(!cameraActive)
                setCheckinError('')
              }}
              className={`${spaceGrotesk.className} w-full max-w-[280px] py-3 text-sm font-bold rounded-xl transition-all ${
                cameraActive 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                  : 'bg-accent hover:bg-blue-600 text-white'
              }`}
            >
              {cameraActive ? 'Stop Scanner' : 'Activate Scanner'}
            </button>

            {cameraError && (
              <p className={`${spaceGrotesk.className} text-xs text-rose-400 font-bold mt-4`}>{cameraError}</p>
            )}
          </div>

          {/* MANUAL OVERRIDE & RECENT STATUS CARD */}
          <div className="space-y-6 flex flex-col">
            
            {/* MANUAL CHECK-IN */}
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6">
              <h2 className={`${fredoka.className} text-xl font-bold mb-4 flex items-center gap-2`}>
                <Search className="w-5 h-5 text-accent" /> Manual Override
              </h2>
              
              <form onSubmit={handleManualCheckIn} className={`space-y-4 ${spaceGrotesk.className}`}>
                <div className="space-y-1.5">
                  <label htmlFor="code-input" className="text-xs font-semibold text-slate-300">
                    Volunteer Member Code
                  </label>
                  <input
                    id="code-input"
                    type="text"
                    placeholder="POT-123456"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-accent"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={checkinLoading || !selectedEventId}
                  className="w-full py-2.5 bg-white/10 hover:bg-white text-white hover:text-slate-900 border border-white/10 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  Submit Check-In
                </button>
              </form>
            </div>

            {/* STATUS / SCAN RESULTS OVERLAY CONTAINER */}
            <div className="flex-grow min-h-[150px] relative">
              <AnimatePresence mode="wait">
                {recentScan ? (
                  /* SUCCESS OVERLAY */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <span className={`${spaceGrotesk.className} text-[10px] text-emerald-400 font-bold uppercase tracking-wider`}>
                          Check-in Successful!
                        </span>
                        <h3 className={`${fredoka.className} text-xl font-bold mt-1 text-white`}>
                          {recentScan.profile.fullName}
                        </h3>
                        <p className={`${spaceGrotesk.className} text-xs text-blue-200 mt-2`}>
                          Member: <strong>{recentScan.profile.memberCode}</strong>
                        </p>
                        <p className={`${spaceGrotesk.className} text-xs text-blue-200 mt-1`}>
                          Checked in at: {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setRecentScan(null)}
                      className={`${spaceGrotesk.className} w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors`}
                    >
                      Next Scan
                    </button>
                  </motion.div>
                ) : checkinError ? (
                  /* ERROR OVERLAY */
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-rose-500/20 rounded-xl border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-rose-400" />
                      </div>
                      <div>
                        <span className={`${spaceGrotesk.className} text-[10px] text-rose-400 font-bold uppercase tracking-wider`}>
                          Scan Error
                        </span>
                        <p className={`${spaceGrotesk.className} text-sm font-semibold text-rose-200 mt-2 leading-relaxed`}>
                          {checkinError}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setCheckinError('')}
                      className={`${spaceGrotesk.className} w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors`}
                    >
                      Dismiss Error
                    </button>
                  </motion.div>
                ) : (
                  /* READY / INSTRUCTIONS STATE */
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 border border-dashed border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center text-blue-300"
                  >
                    <UserCheck className="w-12 h-12 mb-3 opacity-30 text-accent animate-pulse" />
                    <p className={`${spaceGrotesk.className} text-xs font-bold uppercase tracking-widest`}>
                      Ready for Scan
                    </p>
                    <p className={`${spaceGrotesk.className} text-[10px] text-blue-200 mt-2 px-6`}>
                      Please activate the webcam or enter a member code to initiate check-in records.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>
    </main>
  )
}
