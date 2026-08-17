'use client'

import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, HeartHandshake } from 'lucide-react'

const fredoka = Fredoka({ subsets: ['latin'] })
const donationUrl = 'https://hcb.hackclub.com/donations/start/pillars-of-tech'

export default function Fundraiser() {
  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-[#06101f] via-[#0c1730] to-[#11265e] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute right-[-8%] top-[12%] h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute bottom-[-14%] left-[20%] h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-cyan-100">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-100/60">
                Pillars of Tech
              </p>
              <h1 className={`${fredoka.className} text-2xl font-bold tracking-tight sm:text-[2rem]`}>
                Support Us Financially
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1730]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <a
              href={donationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1730]"
            >
              Donate on Hack Club
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <motion.h2
            className={`${fredoka.className} mt-8 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Support student STEM opportunities with a secure donation
          </motion.h2>

          <motion.p
            className="mt-4 max-w-2xl text-base leading-7 text-blue-100/85 sm:text-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            You can donate here on our site through the embedded Hack Club checkout, or open the same
            secure page directly if you prefer.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 flex-1"
        >
          <iframe
            src={donationUrl}
            title="Pillars of Tech donation form"
            className="h-[78vh] min-h-[700px] w-full border-0 sm:h-[82vh]"
            style={{ border: 'none' }}
            scrolling="yes"
            frameBorder="0"
            marginHeight={0}
            marginWidth={0}
            allowFullScreen
            loading="lazy"
          />
        </motion.div>
      </section>
    </main>
  )
}
