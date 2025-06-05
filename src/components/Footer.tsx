'use client'

import { motion } from 'framer-motion'
import { Space_Grotesk } from 'next/font/google'
import Image from 'next/image'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function Footer() {
  return (
    <footer className="py-12 bg-gradient-to-b from-primary to-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative w-32 h-32"
          >
            <Image
              src="/PillarsOfTechLogo.png"
              alt="Pillars of Tech Logo"
              fill
              className="object-contain opacity-80 hover:opacity-100 transition-opacity"
              sizes="(max-width: 768px) 100vw, 128px"
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
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center text-sm text-blue-200/60"
          >
            © 2024 Pillars of Tech. All rights reserved.
          </motion.div>
        </div>
      </div>
    </footer>
  )
} 