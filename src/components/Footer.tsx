'use client'

import { motion } from 'framer-motion'
import { Space_Grotesk } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Mail, Youtube } from 'lucide-react'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function Footer() {
  const footerLinks = [
    {
      label: 'YouTube',
      href: 'https://www.youtube.com/@PillarsofTech',
      icon: Youtube,
      external: true
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/pillarsoftech',
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
    <footer className="py-12 bg-gradient-to-b from-primary to-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="flex flex-col items-center space-y-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative w-[230px] h-[230px]"
            >
              <Image
                src="/potofficiallogo.png"
                alt="Pillars of Tech Logo"
                fill
                className="object-contain opacity-80 hover:opacity-100 transition-opacity"
                sizes="230px"
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
                className={`${spaceGrotesk.className} text-sm text-blue-200 hover:text-white transition-colors`}
              >
                Transparent Finances
              </a>
            </motion.div>

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
                    className={`${spaceGrotesk.className} inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-blue-100 transition-colors hover:bg-white/10 hover:text-white`}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`${spaceGrotesk.className} inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-blue-100 transition-colors hover:bg-white/10 hover:text-white`}
                  >
                    {content}
                  </Link>
                )
              })}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center text-sm text-blue-200/60"
          >
            © 2026 Pillars of Tech. All rights reserved.
          </motion.div>
        </div>
      </div>
    </footer>
  )
} 
