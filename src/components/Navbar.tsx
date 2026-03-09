'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Space_Grotesk } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X, Home, Info, Calendar, Users, Mail } from 'lucide-react'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { name: 'About', href: '/about', icon: Info },
    { name: 'Programs & Events', href: '/events', icon: Calendar },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Contact', href: '/contact', icon: Mail },
  ]

  return (
    <>
      <nav className="sticky top-0 w-full z-50 bg-primary/80 backdrop-blur-md border-b border-white/10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              {/* Mobile Hamburger toggle (Left Side) */}
              <button
                onClick={() => setIsOpen(true)}
                className="md:hidden mr-4 p-2 text-white/70 hover:text-white transition-colors"
                aria-label="Open Menu"
              >
                <Menu className="w-7 h-7" />
              </button>

              <Link href="/" className="flex items-center space-x-3 group">
                <div className="relative w-10 h-10 transition-transform group-hover:scale-110">
                  <Image
                    src="/PillarsOfTechLogo.png"
                    alt="Pillars of Tech Logo"
                    fill
                    className="object-contain"
                    sizes="40px"
                    priority
                  />
                </div>
                <span className={`${spaceGrotesk.className} text-white text-xl md:text-2xl font-black tracking-tighter transition-colors`}>
                  Pillars of Tech
                </span>
              </Link>
            </div>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${spaceGrotesk.className} text-blue-100 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar (Drawer) */}
      <motion.div
        initial={false}
        animate={isOpen ? "open" : "closed"}
        className="fixed inset-0 z-[60] md:hidden pointer-events-none"
      >
        {/* Backdrop overlay */}
        <motion.div
          variants={{
            open: { opacity: 1, pointerEvents: "auto" },
            closed: { opacity: 0, pointerEvents: "none" }
          }}
          onClick={() => setIsOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm shadow-2xl"
        />

        {/* Sidebar Content */}
        <motion.div
          variants={{
            open: { x: 0 },
            closed: { x: "-100%" }
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="absolute inset-y-0 left-0 w-72 bg-gradient-to-b from-primary to-dark border-r border-white/10 p-6 flex flex-col pointer-events-auto shadow-2xl"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center space-x-2">
              <div className="relative w-8 h-8">
                <Image src="/PillarsOfTechLogo.png" alt="Logo" fill className="object-contain" />
              </div>
              <span className={`${spaceGrotesk.className} text-white font-black text-lg`}>Navigation</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 text-white/50 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex flex-col space-y-2">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold group"
            >
              <Home className="w-5 h-5 mr-4 text-accent group-hover:scale-110 transition-transform" />
              Home
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold group"
              >
                <link.icon className="w-5 h-5 mr-4 text-accent group-hover:scale-110 transition-transform" />
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Pillars of Tech</p>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
} 