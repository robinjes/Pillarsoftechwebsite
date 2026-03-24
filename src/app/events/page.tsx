'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import Link from 'next/link'
import { Event } from '@/data/events'
import { Search, Sparkles, MapPin, Clock, Calendar } from 'lucide-react'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

// Fun pastel colors for the cards
const cardColors = [
  'bg-rose-900/40 border-rose-800',
  'bg-blue-900/40 border-blue-800',
  'bg-emerald-900/40 border-emerald-800',
  'bg-purple-900/40 border-purple-800',
  'bg-amber-900/40 border-amber-800',
  'bg-cyan-900/40 border-cyan-800',
]

// Container animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100 } }
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [activeForms, setActiveForms] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  // Fetch events and forms on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/events').then(res => res.json()),
      fetch('/api/forms').then(res => res.json())
    ])
    .then(([eventsData, formsData]) => {
      setEvents(eventsData)
      
      const activeFormEventIds = new Set<string>();
      if (Array.isArray(formsData)) {
        formsData.forEach((form: any) => {
          if (form.isActive) {
            activeFormEventIds.add(form.eventId);
          }
        });
      }
      setActiveForms(activeFormEventIds);
      setLoading(false)
    })
    .catch(console.error)
  }, [])

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === 'all' ? true : event.status === filter
    return matchesSearch && matchesFilter
  })

  const parseEventDate = (dateStr: string): number => {
    // Supports "M/D/YY", "M/D/YYYY", and falls back to Date.parse for other formats.
    const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(dateStr.trim())
    if (mdy) {
      const month = Number(mdy[1])
      const day = Number(mdy[2])
      const yearRaw = mdy[3]
      const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw)
      const d = new Date(year, month - 1, day)
      const t = d.getTime()
      return Number.isFinite(t) ? t : 0
    }

    const t = Date.parse(dateStr)
    return Number.isFinite(t) ? t : 0
  }

  // Sort: upcoming first; past events at the bottom (most recent -> oldest)
  const displayEvents = filteredEvents.sort((a, b) => {
    if (a.status === 'upcoming' && b.status === 'past') return -1
    if (a.status === 'past' && b.status === 'upcoming') return 1

    if (a.status === 'past' && b.status === 'past') {
      return parseEventDate(b.date) - parseEventDate(a.date)
    }

    return 0
  })

  return (
    <main className="min-h-screen pt-24 pb-20 bg-primary transition-colors duration-300 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-accent/10 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/10 bg-purple-500/20 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center space-x-3 mb-6">
            <Sparkles className="w-8 h-8 text-amber-400 animate-bounce" />
            <h1 className={`${fredoka.className} text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-500 pb-5`}>
              Programs & Events
            </h1>
            <Sparkles className="w-8 h-8 text-amber-400 animate-bounce delay-150" />
          </div>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10 opacity-90">
            Join us for hands-on STEM activities, exciting competitions, and amazing opportunities to learn, build, and have fun!
          </p>

          {/* Controls */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-3xl mx-auto">
            <div className="relative w-full md:w-2/3 focus-within:scale-105 transition-transform duration-300">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-accent/50 text-white/50" />
              </div>
              <input
                type="text"
                className={`${spaceGrotesk.className} block w-full pl-12 pr-4 py-4 border-2 border-white/20 rounded-2xl leading-5 bg-dark/80 backdrop-blur-md text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-accent/30 focus:border-accent text-lg shadow-xl shadow-accent/5 transition-all`}
                placeholder="Search for an adventure..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex bg-dark/80 backdrop-blur-md p-1.5 rounded-2xl border-2 border-white/20 shadow-xl shadow-accent/5 w-full md:w-auto">
              {(['all', 'upcoming', 'past'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`${spaceGrotesk.className} relative px-6 py-3 rounded-xl text-sm font-bold capitalize transition-colors w-full md:w-auto ${
                    filter === tab 
                      ? 'text-white' 
                      : 'text-blue-200 hover:text-slate-900 hover:text-white'
                  }`}
                >
                  {filter === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-accent rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent"></div>
          </div>
        )}

        {/* Events Grid */}
        {!loading && (
          <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <AnimatePresence mode="popLayout">
            {displayEvents.map((event, index) => {
              const colorClass = cardColors[index % cardColors.length];
              
              return (
                <motion.div
                  key={event.id}
                  variants={itemVariants}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                  whileHover={{ y: -10, scale: 1.02, rotate: index % 2 === 0 ? 1 : -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`h-full border-2 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col relative group ${colorClass}`}>
                    
                    {/* Status Ribbon */}
                    <div className="absolute top-4 right-[-35px] bg-white text-slate-900 font-bold py-1 px-10 transform rotate-45 text-xs shadow-md z-20 shadow-black/20">
                      {event.status === 'upcoming' ? 'UPCOMING' : 'PAST'}
                    </div>

                    {/* Optional Image */}
                    <Link href={`/events/${event.id}`} className="block">
                      {event.image ? (
                        <div className="h-48 w-full relative overflow-hidden bg-slate-200">
                          <img 
                            src={event.image} 
                            alt={event.title} 
                            className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-110 transition-transform duration-700"
                          />
                        </div>
                      ) : (
                        <div className="h-24 w-full opacity-30 group-hover:opacity-50 transition-opacity flex items-center justify-center">
                          <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/20 via-transparent to-transparent"></div>
                        </div>
                      )}
                    </Link>

                    <div className="p-8 flex flex-col flex-grow relative z-10 bg-black/20 backdrop-blur-sm -mt-4 rounded-t-3xl border-t border-white/10 h-full">
                      <div className="mb-4">
                        <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-4 line-clamp-2 drop-shadow-sm`}>
                          <Link href={`/events/${event.id}`} className="hover:text-blue-100 transition-colors">
                            {event.title}
                          </Link>
                        </h3>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm font-semibold text-blue-100">
                            <Calendar className="w-4 h-4 mr-2 opacity-75" />
                            {event.date}
                          </div>
                          <div className="flex items-center text-sm font-semibold text-blue-100">
                            <Clock className="w-4 h-4 mr-2 opacity-75" />
                            {event.time}
                          </div>
                          <div className="flex items-center text-sm font-semibold text-blue-100">
                            <MapPin className="w-4 h-4 mr-2 opacity-75" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-blue-100/90 font-medium line-clamp-3 mb-6 flex-grow drop-shadow-sm truncate">
                        {event.description}
                      </p>
                      
                      <div className="mt-auto space-y-3">
                        {event.status === 'upcoming' && activeForms.has(event.id) && (
                          <Link href={`/register/${event.id}`} className="inline-flex items-center justify-center w-full px-4 py-3 bg-accent text-slate-900 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95 shadow-md shadow-accent/20">
                            Register Now
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        )}
                        <Link href={`/events/${event.id}`} className="inline-flex items-center justify-center w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all border border-white/10 group">
                          View Details
                          <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          
          {displayEvents.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-20 bg-blue-900/20 backdrop-blur-md rounded-3xl border-2 border-dashed border-white/20"
            >
              <div className="flex justify-center mb-6">
                <Search className="w-16 h-16 text-slate-500 opacity-50" />
              </div>
              <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-2`}>No matching adventures</h3>
              <p className="text-blue-200 text-lg">Try searching for something else!</p>
            </motion.div>
          )}
        </motion.div>
        )}
      </div>
    </main>
  )
}
