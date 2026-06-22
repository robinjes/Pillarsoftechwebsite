'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import {
  Clock, LogIn, LogOut, Edit2, Save, X, Trash2,
  RefreshCw, AlertCircle, CheckCircle2
} from 'lucide-react'
import { volunteerService, VolunteerProfile } from '@/lib/volunteerService'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function AdminHours() {
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingHours, setEditingHours] = useState<number>(0)
  const [editingReason, setEditingReason] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadVolunteers()
  }, [])

  const loadVolunteers = async () => {
    setLoading(true)
    try {
      const profiles = await volunteerService.getAllProfiles()
      const volunteers = profiles.filter(p => p.role === 'volunteer')
      setVolunteers(volunteers.sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0)))
    } catch (err) {
      console.error('Failed to load volunteers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveHours = async (userId: string) => {
    setSavingId(userId)
    try {
      const result = await volunteerService.updateVolunteerHours(
        userId,
        editingHours,
        editingReason || 'Manual adjustment by admin'
      )

      if (result) {
        setVolunteers(volunteers.map(v =>
          v.id === userId ? { ...v, totalHours: editingHours } : v
        ))
        setEditingId(null)
        setSuccessMessage(`Hours updated for ${result.fullName}`)
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (err) {
      console.error('Failed to update hours:', err)
      alert('Failed to update hours. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const startEdit = (volunteer: VolunteerProfile) => {
    setEditingId(volunteer.id)
    setEditingHours(volunteer.totalHours || 0)
    setEditingReason('')
  }

  const filteredVolunteers = volunteers.filter(v =>
    v.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email.toLowerCase().includes(searchTerm.toLowerCase())
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center">
                <Clock className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h1 className={`${fredoka.className} text-4xl font-bold`}>Volunteer Hours</h1>
                <p className={`${spaceGrotesk.className} text-blue-200 text-sm mt-1`}>
                  Manage and review volunteer hours
                </p>
              </div>
            </div>
            <button
              onClick={loadVolunteers}
              disabled={loading}
              className={`${spaceGrotesk.className} px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl mb-4"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className={`${spaceGrotesk.className} font-bold`}>{successMessage}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${spaceGrotesk.className} w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400`}
          />
        </motion.div>

        {/* Volunteers Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/60 border border-white/10 rounded-3xl overflow-hidden"
        >
          {loading ? (
            <div className="p-8 text-center text-blue-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
              Loading volunteers...
            </div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="p-8 text-center text-blue-200">
              <AlertCircle className="w-6 h-6 mx-auto mb-3 opacity-50" />
              No volunteers found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-800/50">
                    <th className={`${spaceGrotesk.className} text-left py-4 px-6 text-xs font-bold text-blue-200`}>
                      Name
                    </th>
                    <th className={`${spaceGrotesk.className} text-left py-4 px-6 text-xs font-bold text-blue-200`}>
                      Email
                    </th>
                    <th className={`${spaceGrotesk.className} text-center py-4 px-6 text-xs font-bold text-blue-200`}>
                      Hours Logged
                    </th>
                    <th className={`${spaceGrotesk.className} text-center py-4 px-6 text-xs font-bold text-blue-200`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVolunteers.map((volunteer, idx) => (
                    <motion.tr
                      key={volunteer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className={`${spaceGrotesk.className} py-4 px-6 font-bold text-white`}>
                        {volunteer.fullName}
                      </td>
                      <td className={`${spaceGrotesk.className} py-4 px-6 text-sm text-blue-300`}>
                        {volunteer.email}
                      </td>
                      <td className={`${spaceGrotesk.className} py-4 px-6 text-center`}>
                        {editingId === volunteer.id ? (
                          <input
                            type="number"
                            value={editingHours}
                            onChange={(e) => setEditingHours(parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                            step="0.5"
                            min="0"
                          />
                        ) : (
                          <span className={`${fredoka.className} text-2xl font-bold text-amber-400`}>
                            {(volunteer.totalHours || 0).toFixed(1)}h
                          </span>
                        )}
                      </td>
                      <td className={`${spaceGrotesk.className} py-4 px-6 text-center`}>
                        {editingId === volunteer.id ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleSaveHours(volunteer.id)}
                              disabled={savingId === volunteer.id}
                              className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(volunteer)}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors inline-flex"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6"
        >
          <h3 className={`${fredoka.className} text-lg font-bold text-white mb-2`}>About Hour Management</h3>
          <p className={`${spaceGrotesk.className} text-sm text-blue-200`}>
            Click the edit button next to any volunteer's hours to adjust them. You can manually set the total hours if a volunteer needs a correction or if they have extra time to log. All changes are recorded for audit purposes.
          </p>
        </motion.div>
      </div>
    </main>
  )
}
