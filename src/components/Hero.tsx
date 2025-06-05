'use client'

import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'

const fredoka = Fredoka({ subsets: ['latin'] })

export default function Hero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <motion.h1 
            className={`${fredoka.className} text-6xl md:text-7xl font-bold text-white mb-4`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Pillars of Tech
          </motion.h1>
          
          <motion.h2 
            className={`${fredoka.className} text-4xl md:text-5xl font-bold text-blue-100 mb-6`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Enabling the next generation of tech leaders
          </motion.h2>
          
          <motion.p 
            className="text-xl md:text-2xl text-blue-200 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Join us in making technology education accessible to all students
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <a 
              href="https://hcb.hackclub.com/donations/start/pillars-of-tech"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-primary/90 hover:bg-primary text-white px-8 py-4 rounded-md font-semibold text-lg transition-colors border border-white/20"
            >
              Make a donation
            </a>
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLSdsNmpS2wpikV77wl1ifpD52a0zAepa-b8DhesqFjPTQVoo7w/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-primary/90 hover:bg-primary text-white px-8 py-4 rounded-md font-semibold text-lg transition-colors border border-white/20"
            >
              Join the team
            </a>
          </motion.div>

          <motion.div
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="text-center bg-blue-800/50 backdrop-blur-sm border border-white/20 p-6 rounded-lg">
              <h3 className={`${fredoka.className} text-3xl font-bold text-white mb-2`}>Our Vision</h3>
              <p className="text-blue-100">We want to empower 1000+ students through technology education and make them future tech leaders by 2025</p>
            </div>
            <div className="text-center bg-blue-800/50 backdrop-blur-sm border border-white/20 p-6 rounded-lg">
              <h3 className={`${fredoka.className} text-3xl font-bold text-white mb-2`}>Partnership</h3>
              <p className="text-white">We are collaborating with Action in Africa to expand tech access and are looking for more partners to make our goal possible!</p>
            </div>
            <div className="text-center bg-blue-800/50 backdrop-blur-sm border border-white/20 p-6 rounded-lg">
              <h3 className={`${fredoka.className} text-3xl font-bold text-white mb-2`}>Join Us</h3>
              <p className="text-blue-100">Be part of our founding team of interns, mentors and more opportunities to come!</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 