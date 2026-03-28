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
        'We want to empower 1000+ students through technology education and make them future tech leaders by 2026.',
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
        className={`group relative h-full overflow-hidden rounded-2xl border border-white/20 bg-blue-900/45 p-5 text-center backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-blue-100/80 hover:shadow-[0_0_38px_rgba(191,219,254,0.5)] ${
          featured ? 'min-h-[210px]' : 'min-h-[170px]'
        }`}
      >
        {card.accent ? (
          <div className={`absolute inset-0 bg-gradient-to-br ${card.accent}`} />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_45%)]" />
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

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500">
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/75 via-blue-900/70 to-blue-700/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.22),transparent_45%)]" />
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
            className={`${fredoka.className} text-4xl md:text-5xl font-bold text-blue-100 mb-6`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Enabling the next generation of tech leaders
          </motion.h2>
          
          <motion.p 
            className="text-xl md:text-2xl text-blue-200 mb-10 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Join us in making technology education accessible to all students
          </motion.p>
          
          <motion.div
            className="mt-14 max-w-7xl mx-auto space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {primaryCards.map((card) => renderCard(card, true))}
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {secondaryCards.map((card) => renderCard(card))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 
