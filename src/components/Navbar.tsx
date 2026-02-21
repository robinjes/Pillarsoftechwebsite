'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Space_Grotesk } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { Sun, Moon } from 'lucide-react'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="sticky top-0 w-full z-50 bg-primary/80 backdrop-blur-sm border-b border-white/10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-8 h-8">
              <Image
                src="/PillarsOfTechLogo.png"
                alt="Pillars of Tech Logo"
                fill
                className="object-contain"
                sizes="32px"
                priority
              />
            </div>
            <span className={`${spaceGrotesk.className} text-white text-xl font-bold transition-colors duration-300`}>
              Pillars of Tech
            </span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            <div className={`${spaceGrotesk.className} flex items-center space-x-4`}>
              <Link href="/about" className="text-blue-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">About</Link>
              <Link href="/events" className="text-blue-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Programs & Events</Link>
              <Link href="/team" className="text-blue-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Team</Link>
              <Link href="/contact" className="text-blue-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Contact</Link>
            </div>
            
          </div>
        </div>
      </div>
    </nav>
  )
} 