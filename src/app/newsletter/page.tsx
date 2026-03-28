import type { Metadata } from 'next'
import { Fredoka } from 'next/font/google'
import { ArrowRight, CalendarDays, Lightbulb, Users } from 'lucide-react'
import {
  newsletterEmbedUrl,
  newsletterPageDescription,
  newsletterSignupUrl,
  newsletterWebsiteUrl
} from '@/data/newsletter'

const fredoka = Fredoka({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Newsletter | Pillars of Tech',
  description: 'Sign up for the Pillars of Tech Sunday newsletter.',
}

const highlights = [
  {
    title: 'Weekly Updates',
    description:
      'See what Pillars of Tech has been building, teaching, and planning each week.',
    Icon: CalendarDays
  },
  {
    title: 'STEM Spotlights',
    description:
      'Read simple STEM ideas and topics that students and parents can explore together.',
    Icon: Lightbulb
  },
  {
    title: 'Upcoming Events',
    description:
      'Stay up to date on upcoming events, opportunities to join, and ways to support our community.',
    Icon: Users
  }
]

export default function NewsletterPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 pt-24 pb-20">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/15 bg-white/10 p-8 text-center shadow-[0_0_60px_rgba(37,99,235,0.2)] backdrop-blur-sm sm:p-10 lg:p-14">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-blue-200">
            Sunday Newsletter
          </p>
          <h1 className={`${fredoka.className} mt-4 text-4xl font-bold text-white sm:text-5xl lg:text-6xl`}>
            Sign Up for Our Newsletter
          </h1>
          <p className="mt-6 mx-auto max-w-3xl text-lg text-blue-100 sm:text-xl">
            {newsletterPageDescription}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={newsletterSignupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-blue-900 shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:bg-blue-50"
            >
              Join the Newsletter
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={newsletterWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-blue-900/40 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-800/70"
            >
              Visit the Newsletter Homepage
            </a>
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-white/15 bg-blue-950/45 p-4 shadow-[0_0_50px_rgba(14,116,144,0.16)] backdrop-blur-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={`${fredoka.className} text-3xl font-bold text-white`}>
                Sign Up Here
              </h2>
              <p className="mt-2 max-w-2xl text-blue-100">
                Fill out the form below to get the Sunday newsletter and stay updated on STEM topics, new programs, and upcoming events.
              </p>
            </div>
            <a
              href={newsletterSignupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 font-bold text-white transition-colors hover:bg-white/15"
            >
              Open Form in a New Tab
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white">
            <iframe
              src={newsletterEmbedUrl}
              title="Pillars of Tech newsletter signup form"
              width="100%"
              height="934"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              className="w-full"
              loading="lazy"
            >
              Loading…
            </iframe>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/15 bg-blue-900/45 p-6 backdrop-blur-sm"
            >
              <item.Icon className="h-10 w-10 text-amber-300" />
              <h2 className={`${fredoka.className} mt-4 text-2xl font-bold text-white`}>
                {item.title}
              </h2>
              <p className="mt-3 text-blue-100">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
