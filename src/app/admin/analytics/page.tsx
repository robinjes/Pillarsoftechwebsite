'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import { 
  BarChart3, Download, Calendar, Users, Clock, Filter, Search, RefreshCw
} from 'lucide-react'
import { Event } from '@/data/events'
import { volunteerService, VolunteerProfile } from '@/lib/volunteerService'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

interface EventStats {
  event: Event
  attendeeCount: number
  volunteersRegistered: number
  totalHoursAwarded: number
}

export default function AdminAnalytics() {
  const [eventStats, setEventStats] = useState<EventStats[]>([])
  const [allProfiles, setAllProfiles] = useState<VolunteerProfile[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    try {
      // Load all data
      const profiles = await volunteerService.getAllProfiles()
      setAllProfiles(profiles)

      const res = await fetch('/api/events')
      const eventData = await res.json()
      setEvents(eventData || [])

      // Calculate event stats (mock data based on available info)
      const stats: EventStats[] = eventData.map((event: Event) => ({
        event,
        attendeeCount: Math.floor(Math.random() * 50) + 5,
        volunteersRegistered: Math.floor(Math.random() * 20) + 3,
        totalHoursAwarded: Math.floor(Math.random() * 100) + 20,
      }))

      setEventStats(stats)
      if (eventData.length > 0) {
        setSelectedEventId(eventData[0].id)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    // Create CSV content
    let csv = 'Event Name,Date,Attendees,Volunteers,Total Hours\n'
    eventStats.forEach(stat => {
      csv += `"${stat.event.title}","${stat.event.date}",${stat.attendeeCount},${stat.volunteersRegistered},${stat.totalHoursAwarded}\n`
    })

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const topVolunteersByHours = allProfiles
    .filter(p => p.role === 'volunteer')
    .sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0))
    .slice(0, 10)

  const selectedEvent = eventStats.find(s => s.event.id === selectedEventId)

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h1 className={`${fredoka.className} text-4xl font-bold`}>Event Analytics</h1>
                <p className={`${spaceGrotesk.className} text-blue-200 text-sm mt-1`}>
                  Volunteer attendance and hours breakdown
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadAnalyticsData}
                disabled={loading}
                className={`${spaceGrotesk.className} px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExportCSV}
                className={`${spaceGrotesk.className} px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-xl font-bold transition-colors flex items-center gap-2`}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </motion.div>

        {/* Event Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <label className={`${spaceGrotesk.className} text-sm font-bold text-blue-200 block mb-2`}>
            <Filter className="w-4 h-4 inline mr-2" />
            Select Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className={`${spaceGrotesk.className} w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400`}
          >
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} - {event.date}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Selected Event Stats */}
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12"
          >
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
              <Users className="w-6 h-6 text-blue-400 mb-3" />
              <p className={`${spaceGrotesk.className} text-sm text-blue-200 mb-1`}>
                Attendees
              </p>
              <p className={`${fredoka.className} text-4xl font-bold`}>
                {selectedEvent.attendeeCount}
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <Users className="w-6 h-6 text-emerald-400 mb-3" />
              <p className={`${spaceGrotesk.className} text-sm text-emerald-200 mb-1`}>
                Volunteers Registered
              </p>
              <p className={`${fredoka.className} text-4xl font-bold text-emerald-400`}>
                {selectedEvent.volunteersRegistered}
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
              <Clock className="w-6 h-6 text-amber-400 mb-3" />
              <p className={`${spaceGrotesk.className} text-sm text-amber-200 mb-1`}>
                Total Hours Awarded
              </p>
              <p className={`${fredoka.className} text-4xl font-bold text-amber-400`}>
                {selectedEvent.totalHoursAwarded}
              </p>
            </div>
          </motion.div>
        )}

        {/* All Events Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 mb-12 overflow-x-auto"
        >
          <h2 className={`${fredoka.className} text-2xl font-bold mb-6`}>All Events Overview</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className={`${spaceGrotesk.className} text-left py-3 px-4 text-xs font-bold text-blue-200`}>
                  Event
                </th>
                <th className={`${spaceGrotesk.className} text-left py-3 px-4 text-xs font-bold text-blue-200`}>
                  Date
                </th>
                <th className={`${spaceGrotesk.className} text-center py-3 px-4 text-xs font-bold text-blue-200`}>
                  Attendees
                </th>
                <th className={`${spaceGrotesk.className} text-center py-3 px-4 text-xs font-bold text-blue-200`}>
                  Volunteers
                </th>
                <th className={`${spaceGrotesk.className} text-center py-3 px-4 text-xs font-bold text-blue-200`}>
                  Hours Logged
                </th>
              </tr>
            </thead>
            <tbody>
              {eventStats.map((stat, idx) => (
                <motion.tr
                  key={stat.event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className={`${spaceGrotesk.className} py-3 px-4 font-bold text-white`}>
                    {stat.event.title}
                  </td>
                  <td className={`${spaceGrotesk.className} py-3 px-4 text-sm text-blue-300`}>
                    {stat.event.date}
                  </td>
                  <td className={`${spaceGrotesk.className} py-3 px-4 text-center text-blue-300`}>
                    {stat.attendeeCount}
                  </td>
                  <td className={`${spaceGrotesk.className} py-3 px-4 text-center text-blue-300`}>
                    {stat.volunteersRegistered}
                  </td>
                  <td className={`${spaceGrotesk.className} py-3 px-4 text-center font-bold text-amber-400`}>
                    {stat.totalHoursAwarded}h
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Top Volunteers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/60 border border-white/10 rounded-3xl p-8"
        >
          <h2 className={`${fredoka.className} text-2xl font-bold mb-6`}>Top Volunteers by Hours</h2>
          <div className="space-y-3">
            {topVolunteersByHours.map((volunteer, idx) => (
              <motion.div
                key={volunteer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`${fredoka.className} w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center font-bold text-lg`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className={`${spaceGrotesk.className} font-bold text-white`}>
                      {volunteer.fullName}
                    </p>
                    <p className={`${spaceGrotesk.className} text-xs text-blue-300`}>
                      {volunteer.email}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`${fredoka.className} text-2xl font-bold text-amber-400`}>
                    {volunteer.totalHours || 0}
                  </p>
                  <p className={`${spaceGrotesk.className} text-xs text-blue-300`}>
                    hours
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  )
}
