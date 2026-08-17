'use client'

import { motion } from 'framer-motion'
import { Space_Grotesk } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Mail, Youtube, CircleHelp, Gift } from 'lucide-react'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function Footer() {
  const footerLinks = [
    {
      label: 'FAQ',
      href: '/faq',
      icon: CircleHelp
    },
    {
      label: 'Wishlist',
      href: '/wishlist',
      icon: Gift
    },
    {
      label: 'YouTube',
      href: 'https://www.youtube.com/@PillarsofTech',
      icon: Youtube,
      external: true
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/thepillarsoftech',
      icon: Instagram,
      external: true
    },
    {
      label: 'Contact Us',
      href: '/contact',
      icon: Mail
    }
  ]

  return (
    <footer className="border-t border-white/10 bg-gradient-to-b from-[#0f1f3f] to-[#091224] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 rounded-[2rem] border border-white/10 bg-white/5 px-6 py-10 text-center shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative h-[120px] w-[180px]"
            >
              <Image
                src="/potofficiallogo.png"
                alt="Pillars of Tech Logo"
                fill
                className="object-contain opacity-90 transition-opacity hover:opacity-100"
                sizes="180px"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <a
                href="https://hcb.hackclub.com/pillars-of-tech/transactions"
                target="_blank"
                rel="noopener noreferrer"
                className={`${spaceGrotesk.className} inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-blue-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091224]`}
              >
                Transparent Finances
              </a>
            </motion.div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              viewport={{ once: true }}
              className="flex flex-wrap items-center justify-center gap-3 pt-4"
            >
              {footerLinks.map((item) => {
                const content = (
                  <>
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </>
                )

                return item.external ? (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${spaceGrotesk.className} inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-blue-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091224]`}
                    >
                      {content}
                    </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`${spaceGrotesk.className} inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-blue-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091224]`}
                  >
                    {content}
                  </Link>
                )
              })}
            </motion.div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center text-sm text-blue-100/60"
          >
            © 2026 Pillars of Tech. All rights reserved.
          </motion.div>
        </div>
      </div>
    </footer>
  )
} 
