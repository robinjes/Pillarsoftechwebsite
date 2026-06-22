'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import { Clock, LogIn, LogOut, AlertCircle, CheckCircle2, Loader } from 'lucide-react'
import { volunteerService, CheckInSession, VolunteerProfile } from '@/lib/volunteerService'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

interface CheckInWidgetProps {
  user: VolunteerProfile
  onHoursUpdated?: (hours: number) => void
}

export default function CheckInWidget({ user, onHoursUpdated }: CheckInWidgetProps) {
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [currentSession, setCurrentSession] = useState<CheckInSession | null>(null)
  const [elapsedTime, setElapsedTime] = useState('00:00:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Check for active session on mount
  useEffect(() => {
    checkCurrentSession()
  }, [user.id])

  // Update elapsed time every second if checked in
  useEffect(() => {
    if (!isCheckedIn || !currentSession) return

    const interval = setInterval(() => {
      const checkInTime = new Date(currentSession.checkInTime)
      const now = new Date()
      const seconds = Math.floor((now.getTime() - checkInTime.getTime()) / 1000)

      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60

      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [isCheckedIn, currentSession])

  const checkCurrentSession = async () => {
    try {
      const session = await volunteerService.getCurrentCheckInStatus(user.id)
      if (session && !session.checkOutTime) {
        setCurrentSession(session)
        setIsCheckedIn(true)
      }
    } catch (err) {
      console.error('Failed to check session status:', err)
    }
  }

  const handleCheckIn = async () => {
    setLoading(true)
    setError('')
    try {
      // Default event ID - in real app, this would be selected
      const eventId = 'general-checkin'
      const session = await volunteerService.startCheckIn(user.id, eventId)
      setCurrentSession(session)
      setIsCheckedIn(true)
      setElapsedTime('00:00:00')
      setSuccess('Checked in successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check in'
      setError(message)
      console.error('Check-in error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!currentSession) return

    setLoading(true)
    setError('')
    try {
      const { hoursAdded } = await volunteerService.checkOut(currentSession.id, user.id)
      setIsCheckedIn(false)
      setCurrentSession(null)
      setElapsedTime('00:00:00')
      setSuccess(`Checked out! ${hoursAdded.toFixed(2)} hours logged.`)
      onHoursUpdated?.(hoursAdded)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check out'
      setError(message)
      console.error('Check-out error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-3xl p-8 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <Clock className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className={`${fredoka.className} text-2xl font-bold text-white`}>Quick Check In/Out</h3>
      </div>

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-4"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className={`${spaceGrotesk.className} font-bold text-sm`}>{error}</span>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl mb-4"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className={`${spaceGrotesk.className} font-bold text-sm`}>{success}</span>
        </motion.div>
      )}

      {/* Status Display */}
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {isCheckedIn ? (
          <div className="text-center">
            <p className={`${spaceGrotesk.className} text-sm text-blue-300 mb-2 font-bold`}>Time Logged</p>
            <div className={`${fredoka.className} text-5xl font-bold text-emerald-400 font-mono mb-2`}>
              {elapsedTime}
            </div>
            <p className={`${spaceGrotesk.className} text-sm text-blue-200`}>
              Checked in at {new Date(currentSession?.checkInTime || '').toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className={`${spaceGrotesk.className} text-sm text-blue-300 mb-2 font-bold`}>Status</p>
            <p className={`${fredoka.className} text-2xl font-bold text-blue-300`}>Not checked in</p>
            <p className={`${spaceGrotesk.className} text-xs text-blue-400 mt-1`}>
              Click below to start your volunteer session
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      {isCheckedIn ? (
        <button
          onClick={handleCheckOut}
          disabled={loading}
          className={`${spaceGrotesk.className} w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg`}
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Checking Out...
            </>
          ) : (
            <>
              <LogOut className="w-5 h-5" />
              Check Out
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleCheckIn}
          disabled={loading}
          className={`${spaceGrotesk.className} w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg`}
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Checking In...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Check In
            </>
          )}
        </button>
      )}

      {/* Info */}
      <p className={`${spaceGrotesk.className} text-xs text-blue-300/60 text-center mt-4`}>
        Time is tracked automatically when you check in/out
      </p>
    </motion.div>
  )
}
