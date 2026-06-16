'use client'

import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { newsletterCardDescription } from '@/data/newsletter'

const fredoka = Fredoka({ subsets: ['latin'] })
const carouselItems = [
  {
    type: 'image',
    src: '/EggDropBG.png',
    label: 'Egg Drop',
    href: '/events/pedrozzi-connect-egg-drop'
  },
  {
    type: 'video',
    src: '/PoT%202.26%20Timelapse.mp4',
    poster: '/Scienceoddyseycover.jpg',
    label: 'Science Odyssey',
    href: '/events/science-odyssey'
  },
  {
    type: 'image',
    src: '/SSPResultBG.png',
    label: 'Stockmen’s Park',
    href: '/events/foil-boat-stockmens'
  },
  {
    type: 'video',
    src: '/videos/events/wildcat-tank/Wildcat%20Tank%20Timelapse.mov',
    label: 'Wildcat Tank Timelapse',
    href: '/wildcat-tank'
  }
]

export default function Hero() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [videoWindow, setVideoWindow] = useState<{ start: number; end: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (carouselItems[activeSlide].type === 'video') {
      return
    }

    const timeout = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % carouselItems.length)
    }, 4500)

    return () => window.clearTimeout(timeout)
  }, [activeSlide])

  useEffect(() => {
    if (carouselItems[activeSlide].type !== 'video') {
      setVideoWindow(null)
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    const startFromMiddle = () => {
      const midpoint = video.duration / 2
      const end = Math.min(midpoint + 10, video.duration)
      video.currentTime = midpoint
      setVideoWindow({ start: midpoint, end })
      void video.play().catch(() => {})
    }

    if (video.readyState >= 1 && Number.isFinite(video.duration)) {
      startFromMiddle()
      return
    }

    video.load()
    video.addEventListener('loadedmetadata', startFromMiddle)

    return () => {
      video.removeEventListener('loadedmetadata', startFromMiddle)
    }
  }, [activeSlide])

  const goToNextSlide = () => {
    setActiveSlide((current) => (current + 1) % carouselItems.length)
  }

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current

    if (!videoWindow || !video) {
      return
    }

    if (video.currentTime >= videoWindow.end - 0.2) {
      video.pause()
      goToNextSlide()
    }
  }

  const primaryCards = [
    {
      title: 'Join Us',
      description:
        'Be part of our founding team of interns, mentors, and more opportunities to come.',
      href: 'https://docs.google.com/forms/d/e/1FAIpQLSdsNmpS2wpikV77wl1ifpD52a0zAepa-b8DhesqFjPTQVoo7w/viewform?usp=header',
      external: true,
      accent: 'from-emerald-300/25 to-blue-500/10'
    },
    {
      title: 'Donate to Us',
      description:
        'By donating to us, you help fund technology education, student programs, and more hands-on opportunities for young learners.',
      href: 'https://hcb.hackclub.com/donations/start/pillars-of-tech',
      external: true,
      accent: 'from-amber-200/30 to-blue-500/10'
    },
    {
      title: 'Our Vision',
      description:
        'We want to empower 1000+ students through STEM education and make them future STEM leaders by 2026.',
      href: '/about',
      accent: 'from-cyan-300/25 to-blue-500/10'
    }
  ]

  const secondaryCards = [
    {
      title: 'Check Out Our Events',
      description:
        'Explore our past and upcoming STEM events, from hands-on challenges to community programs for students.',
      href: '/events'
    },
    {
      title: 'Partnership',
      description:
        'Work with us to bring STEM opportunities to more students. Visit our contact page to reach us directly at pillarsoftech@gmail.com.',
      href: '/contact'
    },
    {
      title: 'Sign Up for Our Newsletter',
      description: newsletterCardDescription,
      href: '/newsletter',
      accent: 'from-sky-300/25 to-cyan-500/10'
    }
  ]

  const renderCard = (
    card: {
      title: string
      description: string
      href: string
      external?: boolean
      accent?: string
    },
    featured = false
  ) => {
    const cardContent = (
      <div
        className={`group relative h-full overflow-hidden rounded-2xl border border-white/15 bg-blue-900/25 p-5 text-center backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-blue-100/40 hover:shadow-[0_0_38px_rgba(191,219,254,0.2)] ${
          featured ? 'min-h-[210px]' : 'min-h-[170px]'
        }`}
      >
        {card.accent ? (
          <div className={`absolute inset-0 bg-gradient-to-br ${card.accent}`} />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
        <div className="relative z-10 flex h-full flex-col justify-center">
          <h3 className={`${fredoka.className} mb-2 text-2xl md:text-3xl font-bold text-white`}>
            {card.title}
          </h3>
          <p className="text-sm md:text-base text-blue-100">{card.description}</p>
        </div>
      </div>
    )

    return card.external ? (
      <a
        key={card.title}
        href={card.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {cardContent}
      </a>
    ) : (
      <Link key={card.title} href={card.href} className="block h-full">
        {cardContent}
      </Link>
    )
  }

  const impactStats = [
    { number: '1000+', label: 'Students Reached' },
    { number: '100%', label: 'Community Focused' },
    { number: '∞', label: 'Potential Unlocked' }
  ]

  const whatWeDo = [
    {
      title: 'STEM Events',
      description: 'Hands-on workshops and competitions like robotics challenges, coding contests, and engineering projects'
    },
    {
      title: 'Tech Education',
      description: 'Mentorship programs and resources to help students develop critical tech skills'
    },
    {
      title: 'Community Access',
      description: 'Making technology education free and accessible to underserved communities'
    }
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500">
        <div className="absolute inset-0">
          {carouselItems.map((item, index) => (
            <div
              key={item.src}
              className={`absolute inset-0 transition-opacity duration-[1600ms] ${
                index === activeSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {item.type === 'image' ? (
                <Image
                  src={item.src}
                  alt=""
                  fill
                  priority={index === 0}
                  className="object-cover"
                  sizes="100vw"
                />
              ) : (
                <video
                  ref={index === activeSlide ? videoRef : undefined}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                  poster={item.poster}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={goToNextSlide}
                >
                  <source src={item.src} type="video/mp4" />
                </video>
              )}
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-blue-900/45 to-blue-700/50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_45%)]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="relative z-10 text-center">
            <motion.h1 
              className={`${fredoka.className} text-6xl md:text-7xl font-bold text-white mb-4`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Pillars of Tech
            </motion.h1>
            
            <motion.h2 
              className={`${fredoka.className} text-3xl md:text-4xl font-bold text-blue-100 mb-6`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Empowering Students Through STEM
            </motion.h2>
            
            <motion.p 
              className="text-lg md:text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              We're a student-led organization dedicated to making STEM education accessible to all. Through hands-on events, mentorship, and community programs, we're building the next generation of STEM leaders.
            </motion.p>
            
            {/* Scroll Indicator */}
            <motion.div
              className="mt-16 flex flex-col items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <p className="text-blue-100 text-sm">Scroll to explore</p>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-6 h-10 border-2 border-blue-100 rounded-full flex items-start justify-center p-2"
              >
                <div className="w-1 h-2 bg-blue-100 rounded-full" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Impact Stats Section */}
      <section className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 backdrop-blur-md py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {impactStats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`${fredoka.className} text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 mb-2`}
                >
                  {stat.number}
                </motion.div>
                <p className="text-blue-100 text-lg">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-20 bg-gradient-to-br from-blue-800/20 via-blue-750/20 to-blue-800/20 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className={`${fredoka.className} text-4xl md:text-5xl font-bold text-white mb-4`}>
              What We Do
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              We create opportunities for students to learn, grow, and excel in technology
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {whatWeDo.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-700/20 to-blue-900/20 p-8 backdrop-blur-md hover:border-blue-300/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-3`}>
                    {item.title}
                  </h3>
                  <p className="text-blue-100 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900/30 via-blue-800/30 to-blue-900/30 backdrop-blur-md border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className={`${fredoka.className} text-4xl font-bold text-white mb-6`}>
              Who We Are
            </h2>
            <p className="text-lg text-blue-100 leading-relaxed mb-6">
              We're a passionate group of high school students committed to spreading STEM education to underserved communities. Every member of our team believes that every student deserves access to technology education, regardless of their background.
            </p>
            <p className="text-lg text-blue-100 leading-relaxed mb-8">
              <span className="text-cyan-300 font-semibold">Fiscally sponsored by Hack Club</span>, we operate under their 501(c)(3) status, ensuring all donations go directly to our mission. Our goal? Empower 1000+ students by 2026.
            </p>
            <Link 
              href="/about"
              className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Learn More About Us
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Cards Section */}
      <section className="py-20 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-700 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className={`${fredoka.className} text-3xl md:text-4xl font-bold text-white`}>
              Get Involved
            </h2>
          </motion.div>
          
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {primaryCards.map((card) => renderCard(card, true))}
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {secondaryCards.map((card) => renderCard(card))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
} 
