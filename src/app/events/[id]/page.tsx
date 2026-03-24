'use client'

import { useParams, useRouter } from 'next/navigation'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import { Event } from '@/data/events'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Rocket, Trophy, Target, ImageIcon } from 'lucide-react'
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
  const [pdfFullscreen, setPdfFullscreen] = useState(false)
  const [scienceVideoOk, setScienceVideoOk] = useState(true)

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
  const registrationStatus = isPast ? 'Completed' : hasForm ? 'Register Now!' : 'Registration Ended'
  const centerContentEvents = new Set([
    'science-odyssey',
    'pedrozzi-connect-egg-drop',
    'foil-boat-stockmens',
  ])
  const centerContent = centerContentEvents.has(event.id)

  return (
    <main ref={containerRef} className="min-h-screen bg-primary transition-colors duration-300">
      {/* Hero Section */}
      <div className="relative h-[68vh] min-h-[520px] w-full overflow-hidden bg-slate-900 border-b border-white/10">
        <motion.div style={{ y, opacity }} className="absolute inset-0 w-full h-full">
          {event.id === 'science-odyssey' ? (
            <div className="w-full h-full">
              {scienceVideoOk ? (
                <video
                  className="w-full h-full object-cover opacity-60"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/Scienceoddyseycover.jpg"
                  onError={() => setScienceVideoOk(false)}
                >
                  <source src="/PoT%202.26%20Timelapse.mp4" type="video/mp4" />
                </video>
              ) : (
                <img
                  src="/Scienceoddyseycover.jpg"
                  alt={event.title}
                  className="w-full h-full object-cover opacity-60"
                />
              )}
            </div>
          ) : event.image ? (
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
        
        <div className="absolute inset-0 flex items-center justify-center px-4 pt-24 pb-28">
          <div className="max-w-5xl mx-auto px-4 w-full text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
            >
              <span className={`inline-block px-4 py-1.5 rounded-full font-bold text-sm tracking-wider uppercase mb-6 shadow-lg ${isPast ? 'bg-emerald-500 text-white' : 'bg-accent text-white'}`}>
                {isPast ? 'Past Event' : 'Upcoming Event'}
              </span>
              <h1 className={`${fredoka.className} mx-auto max-w-6xl text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white drop-shadow-2xl mb-6`}>
                {event.title}
              </h1>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1430px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative z-10 -mt-10 sm:-mt-12 lg:-mt-14 pb-20">
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
                { icon: Rocket, label: "Status", value: registrationStatus }
              ].map((info, idx) => (
                <div key={idx} className="bg-black/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-white/5 hover:scale-105 transition-transform">
                  <info.icon className={`w-8 h-8 ${accentColor} mb-2`} />
                  <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">{info.label}</span>
                  <span className={`${spaceGrotesk.className} font-bold text-white leading-tight mt-1`}>{info.value}</span>
                </div>
              ))}
            </div>

            {/* Two Column Content */}
            <div className={`grid grid-cols-1 gap-10 ${centerContent ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
              {/* Left Column - Main Details */}
              <div className={`${centerContent ? 'max-w-5xl mx-auto space-y-10' : 'lg:col-span-2 space-y-10'}`}>
                <section className={centerContent ? 'max-w-3xl mx-auto' : undefined}>
                  <h2
                    className={`${fredoka.className} flex items-center text-3xl font-bold text-white mb-6 ${
                      centerContent ? 'justify-center text-center' : ''
                    }`}
                  >
                    <Target className={`w-8 h-8 mr-3 ${accentColor}`} />
                    The Mission
                  </h2>
                  <div
                    className={`prose prose-lg prose-invert max-w-none text-blue-100/90 font-medium leading-relaxed whitespace-pre-wrap ${
                      centerContent ? 'text-center' : ''
                    }`}
                  >
                    {event.description}
                  </div>
                </section>

                {event.stats && (
                  <section className={centerContent ? 'max-w-4xl mx-auto' : undefined}>
                    <h2
                      className={`${fredoka.className} flex items-center text-3xl font-bold text-white mb-6 ${
                        centerContent ? 'justify-center text-center' : ''
                      }`}
                    >
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
              <div className={`${centerContent ? 'hidden' : 'space-y-6'}`}>
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
                    <h3 className={`${fredoka.className} flex items-center text-xl font-bold text-white mb-4`}>
                      <span className="w-8 h-8 rounded-full bg-blue-100 bg-blue-800 flex items-center justify-center mr-3">
                        <Rocket className="w-4 h-4 text-blue-600 text-blue-300" />
                      </span>
                      Get Involved
                    </h3>
                    <p className="text-white/90 font-medium mb-4">
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

            {/* Gallery Section */}
            {event.gallery && event.gallery.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-20 pt-20 border-t border-white/10"
              >
                <div className="flex items-center justify-center space-x-3 mb-10">
                  <ImageIcon className={`w-8 h-8 ${accentColor}`} />
                  <h2 className={`${fredoka.className} text-4xl font-bold text-white`}>Event Gallery</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {event.gallery.map((img, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="aspect-video rounded-2xl overflow-hidden border-2 border-white/10 bg-slate-800 shadow-xl"
                    >
                      <img 
                        src={img} 
                        alt={`Gallery ${idx + 1}`} 
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                        onClick={() => window.open(img, '_blank')}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Wildcat Tank Manual (only for this specific event) */}
            {event.id === 'wildcat-tank-altamont' && (
              <section className="mt-20 pt-20 border-t border-white/10">
                <h2 className={`${fredoka.className} flex items-center text-4xl font-bold text-white mb-6 justify-center`}>
                  <span className="mr-3">📄</span>
                  Wildcat Tank Official Manual
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl bg-black/30">
                    <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                      <h3 className={`${fredoka.className} text-2xl font-bold text-white`}>Manual</h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPdfFullscreen(true)}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-colors"
                        >
                          Full screen
                        </button>
                        <a
                          href="/Wildcat%20Tank%20Official%20Manual.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-accent hover:bg-amber-400 text-slate-900 font-bold transition-colors"
                        >
                          Open in new tab
                        </a>
                      </div>
                    </div>
                    <iframe
                      src="/Wildcat%20Tank%20Official%20Manual.pdf"
                      className="w-full"
                      style={{ height: '800px' }}
                      title="Wildcat Tank Official Manual"
                    />
                  </div>

                  <div className="rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl bg-black/30">
                    <div className="px-5 py-4 border-b border-white/10">
                      <h3 className={`${fredoka.className} text-2xl font-bold text-white flex items-center`}>
                        <span className="mr-3 text-red-400">▶</span>
                        Wildcat Tank Video
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="relative w-full rounded-xl overflow-hidden border border-white/10" style={{ paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                          src="https://www.youtube-nocookie.com/embed/tvG1YQygTcc"
                          className="absolute top-0 left-0 w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          title="Wildcat Tank Video"
                        />
                      </div>

                      <div className="pt-2 border-t border-white/10">
                        <h4 className={`${fredoka.className} text-xl font-bold text-white mb-3 flex items-center`}>
                          <span className="mr-3 text-red-400">≡</span>
                          Wildcat Tank Playlist
                        </h4>
                        <div className="relative w-full rounded-xl overflow-hidden border border-white/10" style={{ paddingBottom: '56.25%', height: 0 }}>
                          <iframe
                            src="https://www.youtube-nocookie.com/embed/PCG4Zb7WoUM?list=PLYhV0S6EDHI3vndPYNDoum82bNJtV5rT7&index=2"
                            className="absolute top-0 left-0 w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            title="Wildcat Tank Playlist"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fullscreen PDF overlay */}
                {pdfFullscreen && (
                  <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm p-4 sm:p-6">
                    <div className="w-full h-full bg-slate-950/70 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10">
                        <div className={`${fredoka.className} text-white font-bold text-lg`}>
                          Wildcat Tank Official Manual
                        </div>
                        <button
                          onClick={() => setPdfFullscreen(false)}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-colors"
                        >
                          Close
                        </button>
                      </div>
                      <div className="flex-1">
                        <iframe
                          src="/Wildcat%20Tank%20Official%20Manual.pdf"
                          className="w-full h-full"
                          title="Wildcat Tank Official Manual Fullscreen"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

          </div>
        </motion.div>
      </div>
    </main>
  )
}
