'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import emailjs from '@emailjs/browser'
import { Fredoka } from 'next/font/google'
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  Sparkles,
  Users
} from 'lucide-react'

const fredoka = Fredoka({ subsets: ['latin'] })

const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
const EMAILJS_READY = Boolean(PUBLIC_KEY && SERVICE_ID && TEMPLATE_ID)
const CONTACT_EMAIL = 'pillarsoftech@gmail.com'

if (PUBLIC_KEY) {
  emailjs.init(PUBLIC_KEY)
}

const inquiryHighlights = [
  'Partnerships and school collaborations',
  'Volunteering and event support',
  'Workshop or speaking requests',
  'General questions and feedback'
]

const contactStats = [
  {
    label: 'Typical response',
    value: 'Within 24 hours',
    icon: Clock3
  },
  {
    label: 'Best channel',
    value: CONTACT_EMAIL,
    icon: Mail
  },
  {
    label: 'Great for',
    value: 'Events, outreach, and support',
    icon: Users
  }
]

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const resetTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        window.clearTimeout(resetTimer.current)
      }
    }
  }, [])

  const clearStatusTimer = () => {
    if (resetTimer.current) {
      window.clearTimeout(resetTimer.current)
      resetTimer.current = null
    }
  }

  const scheduleReset = () => {
    clearStatusTimer()
    resetTimer.current = window.setTimeout(() => {
      setStatus('idle')
      setErrorMessage('')
      resetTimer.current = null
    }, 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')
    clearStatusTimer()

    try {
      if (!EMAILJS_READY) {
        throw new Error('The contact form is currently unavailable. Please use email instead.')
      }

      await emailjs.send(SERVICE_ID as string, TEMPLATE_ID as string, {
        to_name: 'Pillars of Tech',
        from_name: formData.name,
        reply_to: formData.email,
        subject: formData.subject,
        message: formData.message,
        to_email: CONTACT_EMAIL
      })

      setStatus('success')
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      })
      scheduleReset()
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Something went wrong while sending the message.'
      )
      scheduleReset()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((currentValue) => ({
      ...currentValue,
      [name]: value
    }))
  }

  const getSubmitButtonText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...'
      case 'success':
        return 'Message Sent'
      case 'error':
        return 'Try Again'
      default:
        return 'Send Message'
    }
  }

  const getSubmitButtonStyle = () => {
    switch (status) {
      case 'sending':
        return 'bg-slate-400/50 cursor-not-allowed'
      case 'success':
        return 'bg-emerald-500 hover:bg-emerald-500'
      case 'error':
        return 'bg-rose-500 hover:bg-rose-600'
      default:
        return 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-sky-500'
    }
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_28%),linear-gradient(180deg,#0a1a3e_0%,#11265e_100%)] pt-20">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] opacity-60" />
        <div className="absolute -left-24 top-6 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Pillars of Tech
            </motion.div>

            <motion.h1
              className={`${fredoka.className} mt-6 text-4xl font-bold tracking-tight text-white sm:text-6xl`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
            >
              Let&apos;s build something meaningful together.
            </motion.h1>

            <motion.p
              className="mx-auto mt-5 max-w-3xl text-base leading-7 text-blue-100 sm:mt-6 sm:text-xl sm:leading-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
            >
              Whether you want to collaborate, support an event, or just say hello, we&apos;d love to
              hear from you.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
            >
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <Mail className="h-4 w-4" />
                Email us directly
              </a>
              <a
                href="#contact-form"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
              >
                Jump to form
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </motion.div>

            <motion.a
              href="#contact-form"
              className="mx-auto mt-10 inline-flex flex-col items-center gap-2 text-sm font-semibold text-cyan-100/90 transition hover:text-white"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2">
                Scroll down for the form
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  className="h-5 w-5 animate-bounce"
                >
                  <path d="M12 5v14" strokeLinecap="round" />
                  <path d="m6 13 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.a>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-white/5 py-16">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {contactStats.map((item, index) => {
            const Icon = item.icon

            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-white/10 bg-slate-950/20 p-5 shadow-[0_20px_80px_-30px_rgba(14,165,233,0.45)] backdrop-blur sm:p-6"
              >
                <div className="flex items-start gap-3 sm:items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-200">{item.label}</p>
                    <p className="font-semibold text-white">{item.value}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,rgba(17,38,94,0.92)_0%,rgba(8,15,36,0.96)_100%)] py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8"
          >
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/25 to-blue-500/25 text-cyan-200">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className={`${fredoka.className} text-2xl font-bold text-white sm:text-3xl`}>
                  What to reach out about
                </h2>
                <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
                  We keep this page simple so it&apos;s easy to start a conversation.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {inquiryHighlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-4 text-sm text-blue-50"
                >
                  <CheckCircle2 className="h-5 w-5 flex-none text-cyan-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Quick note
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-100">
                If your message is about an event, include the date, location, and any deadlines so
                we can respond with something useful right away.
              </p>
            </div>
          </motion.div>

          <motion.div
            id="contact-form"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-white/10 bg-slate-950/25 p-6 shadow-[0_24px_100px_-40px_rgba(59,130,246,0.65)] backdrop-blur sm:p-8"
          >
            <div className="mb-8">
              <h2 className={`${fredoka.className} text-2xl font-bold text-white sm:text-3xl`}>
                Send a message
              </h2>
              <p className="mt-2 text-sm text-blue-100 sm:text-base">We usually reply within one business day.</p>
            </div>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-100"
                role="alert"
                aria-live="polite"
              >
                {errorMessage}
              </motion.div>
            )}

            {!EMAILJS_READY && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-100"
                role="status"
                aria-live="polite"
              >
                The form is temporarily unavailable. Please email us at{' '}
                <a className="font-semibold underline" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
                .
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100"
                role="status"
                aria-live="polite"
              >
                Your message is on its way. We&apos;ll get back to you soon.
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-semibold text-cyan-100">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-blue-200/40 outline-none transition focus:border-cyan-300/40 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/20"
                    required
                    disabled={status === 'sending'}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-cyan-100">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-blue-200/40 outline-none transition focus:border-cyan-300/40 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/20"
                    required
                    disabled={status === 'sending'}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="mb-2 block text-sm font-semibold text-cyan-100">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="How can we help?"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-blue-200/40 outline-none transition focus:border-cyan-300/40 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/20"
                  required
                  disabled={status === 'sending'}
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-semibold text-cyan-100">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us a little about your idea, question, or event..."
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-blue-200/40 outline-none transition focus:border-cyan-300/40 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/20"
                  required
                  disabled={status === 'sending'}
                />
              </div>

              <motion.button
                type="submit"
                disabled={status === 'sending' || !EMAILJS_READY}
                whileHover={{ scale: status === 'sending' ? 1 : 1.01 }}
                whileTap={{ scale: status === 'sending' ? 1 : 0.99 }}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold text-white shadow-lg shadow-cyan-500/20 transition ${getSubmitButtonStyle()}`}
              >
                {status === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                {getSubmitButtonText()}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>
    </>
  )
}
