'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import { Users, Search, Shield, Heart, RefreshCw, Loader2, Copy, Check } from 'lucide-react'
import { volunteerService, VolunteerProfile } from '@/lib/volunteerService'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function AdminVolunteers() {
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([])
  const [filteredVolunteers, setFilteredVolunteers] = useState<VolunteerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'volunteer' | 'staff'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadVolunteers()
  }, [])

  const loadVolunteers = async () => {
    setLoading(true)
    try {
      const profiles = await volunteerService.getAllProfiles()
      setVolunteers(profiles)
      filterVolunteers(profiles, searchTerm, roleFilter)
    } catch (err) {
      console.error('Failed to load volunteers:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterVolunteers = (allVolunteers: VolunteerProfile[], search: string, role: string) => {
    let filtered = allVolunteers

    if (search.trim()) {
      const lower = search.toLowerCase()
      filtered = filtered.filter(v =>
        v.fullName.toLowerCase().includes(lower) ||
        v.email.toLowerCase().includes(lower) ||
        v.memberCode.toLowerCase().includes(lower)
      )
    }

    if (role !== 'all') {
      filtered = filtered.filter(v => v.role === role)
    }

    setFilteredVolunteers(filtered)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterVolunteers(volunteers, term, roleFilter)
  }

  const handleRoleFilter = (role: 'all' | 'volunteer' | 'staff') => {
    setRoleFilter(role)
    filterVolunteers(volunteers, searchTerm, role)
  }

  const handleToggleRole = async (userId: string, currentRole: 'volunteer' | 'staff') => {
    const newRole = currentRole === 'volunteer' ? 'staff' : 'volunteer'
    setUpdatingId(userId)

    try {
      const result = await volunteerService.updateUserRole(userId, newRole)
      if (result) {
        const updatedVolunteers = volunteers.map(v => v.id === userId ? result : v)
        setVolunteers(updatedVolunteers)
        filterVolunteers(updatedVolunteers, searchTerm, roleFilter)
      }
    } catch (err) {
      console.error('Failed to update role:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const staffCount = volunteers.filter(v => v.role === 'staff').length
  const volunteerCount = volunteers.filter(v => v.role === 'volunteer').length

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
                <Users className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h1 className={`${fredoka.className} text-4xl font-bold`}>Volunteers & Staff</h1>
                <p className={`${spaceGrotesk.className} text-blue-200 text-sm mt-1`}>
                  Manage volunteer roles and permissions
                </p>
              </div>
            </div>
            <button
              onClick={loadVolunteers}
              disabled={loading}
              className={`${spaceGrotesk.className} px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className={`${spaceGrotesk.className} text-xs text-blue-300 font-bold uppercase mb-1`}>Total Users</p>
              <p className={`${fredoka.className} text-3xl font-bold`}>{volunteers.length}</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <p className={`${spaceGrotesk.className} text-xs text-emerald-300 font-bold uppercase mb-1`}>Volunteers</p>
              <p className={`${fredoka.className} text-3xl font-bold text-emerald-400`}>{volunteerCount}</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
              <p className={`${spaceGrotesk.className} text-xs text-purple-300 font-bold uppercase mb-1`}>Staff</p>
              <p className={`${fredoka.className} text-3xl font-bold text-purple-400`}>{staffCount}</p>
            </div>
          </div>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, or member code..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className={`${spaceGrotesk.className} w-full bg-slate-900/80 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all`}
            />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'volunteer', 'staff'] as const).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleFilter(role)}
                className={`${spaceGrotesk.className} px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                  roleFilter === role
                    ? 'bg-blue-500 text-white border border-blue-400'
                    : 'bg-white/5 text-blue-200 border border-white/10 hover:bg-white/10'
                }`}
              >
                {role === 'all' ? '👥 All' : role === 'volunteer' ? '❤️ Volunteers' : '🛡️ Staff'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Volunteers List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
              <p className={`${spaceGrotesk.className} text-blue-200`}>Loading volunteers...</p>
            </div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="text-center py-16 bg-white/5 border border-dashed border-white/10 rounded-2xl">
              <Users className="w-10 h-10 text-blue-200/30 mx-auto mb-3" />
              <p className={`${spaceGrotesk.className} text-blue-200`}>No volunteers found</p>
            </div>
          ) : (
            filteredVolunteers.map((volunteer, idx) => (
              <motion.div
                key={volunteer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 text-lg font-bold">
                      {volunteer.fullName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className={`${fredoka.className} text-lg font-bold text-white truncate`}>
                          {volunteer.fullName}
                        </h3>
                        <span
                          className={`${spaceGrotesk.className} text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                            volunteer.role === 'staff'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {volunteer.role === 'staff' ? '🛡️ Staff' : '❤️ Volunteer'}
                        </span>
                      </div>

                      <p className={`${spaceGrotesk.className} text-sm text-blue-300 mb-2 truncate`}>
                        {volunteer.email}
                      </p>

                      <div className="flex items-center gap-2">
                        <code className={`${spaceGrotesk.className} text-xs bg-black/40 px-3 py-1 rounded-lg text-blue-200 font-mono`}>
                          {volunteer.memberCode}
                        </code>
                        <button
                          onClick={() => handleCopyCode(volunteer.memberCode, volunteer.id)}
                          title="Copy member code"
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-blue-300 hover:text-white"
                        >
                          {copiedId === volunteer.id ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Role Toggle Button */}
                  <button
                    onClick={() => handleToggleRole(volunteer.id, volunteer.role)}
                    disabled={updatingId === volunteer.id}
                    className={`${spaceGrotesk.className} px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                      volunteer.role === 'staff'
                        ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                    } disabled:opacity-50`}
                  >
                    {updatingId === volunteer.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : volunteer.role === 'staff' ? (
                      <>
                        <Shield className="w-4 h-4" />
                        Make Volunteer
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Make Staff
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </main>
  )
}
