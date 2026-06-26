'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Space_Grotesk } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X, Home, Info, Calendar, Users, Mail, Newspaper, Heart, CircleHelp, Gift, ChevronDown } from 'lucide-react'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const navGroups = [
    {
      label: 'About',
      icon: Info,
      items: [
        { name: 'About Us', href: '/about', icon: Info },
        { name: 'Team', href: '/team', icon: Users },
      ],
    },
    {
      label: 'Programs',
      icon: Calendar,
      items: [
        { name: 'Programs & Events', href: '/events', icon: Calendar },
        { name: 'Newsletter', href: '/newsletter', icon: Newspaper },
      ],
    },
    {
      label: 'Get Involved',
      icon: Heart,
      items: [
        { name: 'Volunteer', href: '/volunteer', icon: Heart },
        { name: 'Wishlist', href: '/wishlist', icon: Gift },
      ],
    },
    {
      label: 'Help',
      icon: CircleHelp,
      items: [
        { name: 'FAQ', href: '/faq', icon: CircleHelp },
        { name: 'Contact', href: '/contact', icon: Mail },
      ],
    },
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
                className="md:hidden mr-4 min-h-11 min-w-11 rounded-xl p-2 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                aria-label="Open Menu"
              >
                <Menu className="w-7 h-7" />
              </button>

              <Link href="/" className="flex items-center space-x-3 group">
                <div className="relative w-[256px] h-[58px] md:w-[340px] md:h-[76px] transition-transform group-hover:scale-105">
                  <Image
                    src="/pot-banner-slogan-white-text.png"
                    alt="Pillars of Tech banner logo"
                    fill
                    className="object-contain"
                    sizes="(min-width: 768px) 340px, 256px"
                    priority
                  />
                </div>
              </Link>
            </div>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-3">
              {navGroups.map((group) => (
                <div key={group.label} className="relative group">
                  <button
                    type="button"
                    className={`${spaceGrotesk.className} inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-blue-100 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary`}
                    aria-haspopup="menu"
                  >
                    <group.icon className="h-4 w-4" />
                    {group.label}
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>

                  <div className="invisible absolute left-0 top-full z-50 mt-3 min-w-56 translate-y-2 rounded-2xl border border-white/10 bg-[#08101f]/95 p-2 opacity-0 shadow-2xl backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${spaceGrotesk.className} flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-blue-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary`}
                      >
                        <item.icon className="h-4 w-4 text-cyan-200" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
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
              <div className="relative w-[176px] h-[40px]">
                <Image src="/pot-banner-slogan-white-text.png" alt="Pillars of Tech banner logo" fill className="object-contain" />
              </div>
              <span className={`${spaceGrotesk.className} text-white font-black text-lg`}>Navigation</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="min-h-11 min-w-11 rounded-xl p-2 text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex flex-col space-y-4">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              <Home className="w-5 h-5 mr-4 text-accent group-hover:scale-110 transition-transform" />
              Home
            </Link>
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="flex items-center gap-2 px-2 text-xs font-black uppercase tracking-[0.22em] text-white/35">
                  <group.icon className="h-4 w-4" />
                  <span>{group.label}</span>
                </div>
                <div className="grid gap-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex min-h-11 items-center px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                    >
                      <item.icon className="w-5 h-5 mr-4 text-accent group-hover:scale-110 transition-transform" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
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
