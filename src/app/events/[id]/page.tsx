'use client'

import { useParams, useRouter } from 'next/navigation'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import { Event } from '@/data/events'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Rocket, Trophy, Target } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const containerRef = useRef(null)

  const [event, setEvent] = useState<Event | null>(null)
  const [hasForm, setHasForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch('/api/events').then(res => res.json()),
      fetch('/api/forms').then(res => res.json())
    ])
    .then(([eventsData, formsData]) => {
      const foundEvent = eventsData.find((e: Event) => e.id === id);
      setEvent(foundEvent || null);

      if (Array.isArray(formsData)) {
        const activeForm = formsData.find((f: any) => f.eventId === id && f.isActive);
        setHasForm(!!activeForm);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-20 flex flex-col items-center justify-center bg-primary">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen pt-24 pb-20 flex flex-col items-center justify-center bg-primary">
        <h1 className={`${fredoka.className} text-4xl font-bold mb-4`}>Adventure Not Found</h1>
        <button onClick={() => router.push('/events')} className="text-accent underline flex items-center">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>
      </div>
    )
  }

  const isPast = event.status === 'past'
  const accentColor = isPast ? 'text-emerald-500' : 'text-accent'
  const bgAccent = isPast ? 'bg-emerald-500' : 'bg-accent'

  return (
    <main ref={containerRef} className="min-h-screen bg-primary transition-colors duration-300">
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden bg-slate-900 border-b border-white/10">
        <motion.div style={{ y, opacity }} className="absolute inset-0 w-full h-full">
          {event.image ? (
            <img 
              src={event.image} 
              alt={event.title} 
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary via-dark to-purple-900 opacity-80" />
          )}
        </motion.div>
        
        {/* Decorative Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 from-primary via-transparent to-transparent" />
        
        <div className="absolute inset-0 flex items-center justify-center pt-16">
          <div className="max-w-5xl mx-auto px-4 w-full text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
            >
              <span className={`inline-block px-4 py-1.5 rounded-full font-bold text-sm tracking-wider uppercase mb-6 shadow-lg ${isPast ? 'bg-emerald-500 text-white' : 'bg-accent text-white'}`}>
                {isPast ? 'Past Event' : 'Upcoming Event'}
              </span>
              <h1 className={`${fredoka.className} text-5xl sm:text-7xl md:text-8xl font-black text-white drop-shadow-2xl mb-6`}>
                {event.title}
              </h1>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-20 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-blue-900/80 backdrop-blur-xl border-2 border-white/20 rounded-[2rem] p-6 sm:p-10 shadow-2xl mb-8">
            <button 
              onClick={() => router.push('/events')}
              className="text-blue-200 hover:text-white mb-8 flex items-center transition-colors font-bold group bg-black/20 px-4 py-2 rounded-full w-fit"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> 
              Back to Awesome Events
            </button>

            {/* Core Info Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {[
                { icon: Calendar, label: "Date", value: event.date },
                { icon: Clock, label: "Time", value: event.time },
                { icon: MapPin, label: "Location", value: event.location },
                { icon: Rocket, label: "Status", value: isPast ? "Completed" : "Register Now!" }
              ].map((info, idx) => (
                <div key={idx} className="bg-black/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-white/5 hover:scale-105 transition-transform">
                  <info.icon className={`w-8 h-8 ${accentColor} mb-2`} />
                  <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">{info.label}</span>
                  <span className={`${spaceGrotesk.className} font-bold text-white leading-tight mt-1`}>{info.value}</span>
                </div>
              ))}
            </div>

            {/* Two Column Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Left Column - Main Details */}
              <div className="lg:col-span-2 space-y-10">
                <section>
                  <h2 className={`${fredoka.className} flex items-center text-3xl font-bold text-white mb-6`}>
                    <Target className={`w-8 h-8 mr-3 ${accentColor}`} />
                    The Mission
                  </h2>
                  <div className="prose prose-lg prose-invert max-w-none text-blue-100/90 font-medium leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </div>
                </section>

                {event.stats && (
                  <section>
                    <h2 className={`${fredoka.className} flex items-center text-3xl font-bold text-white mb-6`}>
                      <Trophy className={`w-8 h-8 mr-3 ${accentColor}`} />
                      Impact & Results
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {event.stats.map((stat, idx) => (
                        <div key={idx} className="bg-white/5 border-2 border-white/10 rounded-2xl p-6 text-center">
                          <div className={`${fredoka.className} text-4xl font-black ${accentColor} mb-2`}>{stat.value}</div>
                          <div className="font-bold text-blue-200">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column - Logistics & Tasks */}
              <div className="space-y-6">
                {event.guests && event.guests.length > 0 && (
                  <div className="bg-purple-50 bg-purple-900/20 border-2 border-purple-200 border-purple-700/50 rounded-3xl p-6">
                    <h3 className={`${fredoka.className} flex items-center text-xl font-bold text-purple-900 text-purple-400 mb-4`}>
                      <Users className="w-5 h-5 mr-2 flex-shrink-0" /> Special Guests
                    </h3>
                    <ul className="space-y-2">
                      {event.guests.map((g, i) => (
                        <li key={i} className="text-purple-800 text-purple-200 font-bold flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!isPast && (
                  <div className="bg-blue-900/20 border-2 border-blue-200 border-blue-700/50 rounded-3xl p-6 mt-6">
                    <h3 className={`${fredoka.className} flex items-center text-xl font-bold text-blue-900 text-blue-400 mb-4`}>
                      <span className="w-8 h-8 rounded-full bg-blue-100 bg-blue-800 flex items-center justify-center mr-3">
                        <Rocket className="w-4 h-4 text-blue-600 text-blue-300" />
                      </span>
                      Get Involved
                    </h3>
                    <p className="text-blue-800 text-blue-200 font-medium mb-4">
                      Interested in participating, mentoring, or sponsoring this event? We would love to have your support!
                    </p>
                    {hasForm ? (
                      <div className="flex flex-col gap-3">
                        <button onClick={() => router.push(`/register/${event.id}`)} className="w-full py-3 bg-accent hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors shadow-md text-center block">
                          Register Now
                        </button>
                        <button onClick={() => router.push('/contact')} className="w-full py-3 bg-blue-800/50 hover:bg-blue-800 text-white font-bold rounded-xl transition-colors shadow-md text-center inline-block mt-2">
                          Contact Us
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => router.push('/contact')} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md text-center inline-block">
                        Contact Us
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </main>
  )
}
