'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import { 
  BarChart3, Users, Calendar, Clock, TrendingUp, 
  Activity, Heart, Trophy, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { Event } from '@/data/events'
import { volunteerService, VolunteerProfile, VolunteerSignup } from '@/lib/volunteerService'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

interface DashboardStats {
  totalVolunteers: number
  totalStaff: number
  totalEvents: number
  totalHoursLogged: number
  averageHoursPerVolunteer: number
  upcomingEvents: number
  pastEvents: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVolunteers: 0,
    totalStaff: 0,
    totalEvents: 0,
    totalHoursLogged: 0,
    averageHoursPerVolunteer: 0,
    upcomingEvents: 0,
    pastEvents: 0,
  })
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load profiles
      const profiles = await volunteerService.getAllProfiles()
      const volunteers = profiles.filter(p => p.role === 'volunteer')
      const staff = profiles.filter(p => p.role === 'staff')

      // Load events
      const res = await fetch('/api/events')
      const eventData = await res.json()
      setEvents(eventData || [])

      // Calculate stats
      const upcoming = eventData.filter((e: Event) => e.status === 'upcoming').length
      const past = eventData.filter((e: Event) => e.status !== 'upcoming').length

      // Calculate hours (mock calculation from volunteers)
      let totalHours = 0
      volunteers.forEach(v => {
        totalHours += v.totalHours || 0
      })

      const avgHours = volunteers.length > 0 ? Math.round(totalHours / volunteers.length) : 0

      setStats({
        totalVolunteers: volunteers.length,
        totalStaff: staff.length,
        totalEvents: eventData.length,
        totalHoursLogged: totalHours,
        averageHoursPerVolunteer: avgHours,
        upcomingEvents: upcoming,
        pastEvents: past,
      })
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    color, 
    trend 
  }: { 
    icon: any
    label: string
    value: string | number
    color: string
    trend?: string
  }) => (
    <motion.div
      whileHover={{ y: -4 }}
      className={`rounded-2xl p-6 border ${color}`}
    >
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-6 h-6" />
        {trend && <span className="text-xs font-bold text-emerald-400">+{trend}%</span>}
      </div>
      <p className={`${spaceGrotesk.className} text-sm text-blue-200 mb-1 font-medium`}>
        {label}
      </p>
      <p className={`${fredoka.className} text-3xl font-bold`}>
        {value}
      </p>
    </motion.div>
  )

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className={`${fredoka.className} text-4xl font-bold`}>Admin Dashboard</h1>
              <p className={`${spaceGrotesk.className} text-blue-200 text-sm mt-1`}>
                Overview of volunteers, events, and activity
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12"
        >
          <StatCard
            icon={Users}
            label="Total Volunteers"
            value={stats.totalVolunteers}
            color="bg-emerald-500/10 border-emerald-500/20"
            trend="12"
          />
          <StatCard
            icon={Heart}
            label="Staff Members"
            value={stats.totalStaff}
            color="bg-purple-500/10 border-purple-500/20"
          />
          <StatCard
            icon={Calendar}
            label="Total Events"
            value={stats.totalEvents}
            color="bg-blue-500/10 border-blue-500/20"
          />
          <StatCard
            icon={Clock}
            label="Hours Logged"
            value={stats.totalHoursLogged}
            color="bg-amber-500/10 border-amber-500/20"
          />
        </motion.div>

        {/* Secondary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12"
        >
          <StatCard
            icon={TrendingUp}
            label="Avg Hours per Volunteer"
            value={stats.averageHoursPerVolunteer}
            color="bg-cyan-500/10 border-cyan-500/20"
          />
          <StatCard
            icon={Activity}
            label="Upcoming Events"
            value={stats.upcomingEvents}
            color="bg-green-500/10 border-green-500/20"
          />
          <StatCard
            icon={Trophy}
            label="Completed Events"
            value={stats.pastEvents}
            color="bg-orange-500/10 border-orange-500/20"
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 mb-12"
        >
          <h2 className={`${fredoka.className} text-2xl font-bold mb-6`}>Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Manage Volunteers', href: '/admin/volunteers', icon: Users },
              { label: 'View Event Reports', href: '/admin/analytics', icon: BarChart3 },
              { label: 'Create New Event', href: '/admin/events', icon: Calendar },
            ].map((action, idx) => {
              const Icon = action.icon
              return (
                <motion.div key={idx} whileHover={{ x: 4 }}>
                  <Link
                    href={action.href}
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
                  >
                    <span className={`${spaceGrotesk.className} font-bold text-blue-200 group-hover:text-white`}>
                      {action.label}
                    </span>
                    <Icon className="w-5 h-5 text-accent group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/60 border border-white/10 rounded-3xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className={`${fredoka.className} text-2xl font-bold`}>Recent Events</h2>
            <Link
              href="/admin/events"
              className="text-sm font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.slice(0, 5).map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl hover:border-white/10 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <h3 className={`${spaceGrotesk.className} font-bold text-white truncate`}>
                    {event.title}
                  </h3>
                  <p className={`${spaceGrotesk.className} text-xs text-blue-300 mt-1`}>
                    {event.date} • {event.time}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-4 ${
                    event.status === 'upcoming'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-500/20 text-slate-300'
                  }`}
                >
                  {event.status}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  )
}

