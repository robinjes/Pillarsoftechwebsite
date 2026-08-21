'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, CheckCircle2, Mail, MessageCircle, Send } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import SignalPageIntro from '@/components/site/SignalPageIntro'

const CONTACT_EMAIL = 'pillarsoftech@gmail.com'

const subjectOptions = [
  { value: 'general', label: 'General inquiries & feedback' },
  { value: 'workshop', label: 'Host a workshop at your school' },
  { value: 'wishlist', label: 'Hardware & equipment donations' },
  { value: 'partnerships', label: 'Partnerships and school collaborations' },
] as const

type SubjectValue = (typeof subjectOptions)[number]['value']

const inquiryHighlights = [
  'Partnerships and school collaborations',
  'Volunteering and event support',
  'Workshop or speaking requests',
  'General questions and feedback',
]

export default function Contact() {
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general' as SubjectValue,
    schoolName: '',
    studentCount: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const resetTimer = useRef<number | null>(null)

  useEffect(() => {
    const reason = searchParams.get('reason')
    if (reason && subjectOptions.some((option) => option.value === reason)) {
      setFormData((currentValue) => ({ ...currentValue, subject: reason as SubjectValue }))
    }
  }, [searchParams])

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current)
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage('')
    clearStatusTimer()

    const subjectLabel = subjectOptions.find((option) => option.value === formData.subject)?.label ?? 'General inquiries & feedback'

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: subjectLabel,
          schoolName: formData.subject === 'workshop' ? formData.schoolName : '',
          studentCount: formData.subject === 'workshop' ? formData.studentCount : '',
          message: formData.message,
          honeypot,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'We could not send that message. Please check the form or email us directly.')
      }

      setStatus('success')
      setFormData({ name: '', email: '', subject: 'general', schoolName: '', studentCount: '', message: '' })
      setHoneypot('')
      scheduleReset()
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'We could not send that message. Please email us directly instead.')
      scheduleReset()
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setFormData((currentValue) => ({ ...currentValue, [name]: value }))
  }

  const handleSubjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSubject = event.target.value as SubjectValue
    setFormData((currentValue) => ({
      ...currentValue,
      subject: nextSubject,
      schoolName: nextSubject === 'workshop' ? currentValue.schoolName : '',
      studentCount: nextSubject === 'workshop' ? currentValue.studentCount : '',
    }))
  }

  const isWorkshop = formData.subject === 'workshop'
  const isSending = status === 'sending'
  const buttonLabel = status === 'sending' ? 'Sending message…' : status === 'success' ? 'Message received' : status === 'error' ? 'Try again' : 'Send message'
  const buttonClass = status === 'sending'
    ? 'cursor-not-allowed bg-[var(--carbon)]/30 text-[var(--carbon)]/50'
    : status === 'success'
      ? 'bg-[var(--ultramarine)] text-[var(--off-white)]'
      : status === 'error'
        ? 'bg-red-700 text-[var(--off-white)] hover:bg-red-800'
        : 'bg-[var(--carbon)] text-[var(--off-white)] hover:bg-[var(--ultramarine)]'

  return (
    <div className="bg-[var(--bone)] text-[var(--carbon)]">
      <SignalPageIntro
        eyebrow="PATCH PANEL / 01"
        title="Let&apos;s make the next step clear."
        description="Tell us what you are working on, what you want to ask, or where you would like to help."
        image={{
          src: '/images/events/pedrozzi-connect-egg-drop/drive-04.webp',
          alt: 'Seven student volunteers pose outdoors; one holds a small drone and controller.',
        }}
        tone="bone"
        imagePosition="center"
        actions={(
          <a href={`mailto:${CONTACT_EMAIL}`} className="signal-button signal-button--orange">
            <MessageCircle aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
            {CONTACT_EMAIL}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </a>
        )}
      />
      <p className="sr-only">Bring the idea, question, or next practical step.</p>

      <section className="border-b border-[var(--carbon)]/25 bg-[var(--off-white)]">
        <div className="signal-shell grid gap-12 py-16 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:py-28">
          <div>
            <p className="signal-mono text-[var(--signal-orange)]">PATCH NOTES / 02 · CONVERSATION STARTERS</p>
            <h2 className="mt-4 max-w-sm font-display text-4xl font-semibold leading-[0.92] tracking-[-0.055em] text-[var(--carbon)] sm:text-5xl">Bring the useful details.</h2>
            <p className="mt-5 max-w-sm font-body text-base leading-7 text-[var(--carbon)]/65">
              Choose a subject and include the context that will help us understand what you need.
            </p>
            <ul className="mt-8 divide-y divide-[var(--carbon)]/20 border-y border-[var(--carbon)]/25 font-body text-sm font-semibold text-[var(--carbon)]">
              {inquiryHighlights.map((item, index) => (
                <li key={item} className="flex items-start gap-4 py-4">
                  <span className="signal-mono text-[var(--signal-orange)]">0{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-l-2 border-[var(--ultramarine)] pl-4 font-body text-sm leading-6 text-[var(--carbon)]/65">
              For an event request, include the date, location, and any relevant constraints.
            </p>
            <figure className="relative mt-9 aspect-[4/3] overflow-hidden border border-[var(--carbon)]/35 bg-[var(--mist)]">
              <Image
                src="/images/events/pedrozzi-connect-egg-drop/drive-02.webp"
                alt="Students sit in an auditorium during the opening workshop at Pedrozzi Connect."
                fill
                sizes="(min-width: 1024px) 28vw, 100vw"
                className="object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--carbon)]/85 px-3 py-2 signal-mono text-[var(--off-white)]">FIELD RECORD / START WITH CONTEXT</figcaption>
            </figure>
          </div>

          <section id="contact-form" className="border border-[var(--carbon)]/35 bg-[var(--bone)] p-5 sm:p-8">
            <div className="flex flex-col gap-5 border-b border-[var(--carbon)] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="signal-mono text-[var(--signal-orange)]">LIVE CHANNEL / 03</p>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-[0.95] tracking-[-0.045em] text-[var(--carbon)] sm:text-4xl">Send a note.</h2>
              </div>
              <Send aria-hidden="true" className="h-7 w-7 text-[var(--ultramarine)]" strokeWidth={1.7} />
            </div>

            {errorMessage && (
              <div id="contact-error" className="mt-6 border-l-2 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950" role="alert" aria-live="polite">
                {errorMessage}
              </div>
            )}

            {status === 'success' && (
              <div className="mt-6 border-l-2 border-[var(--ultramarine)] bg-[var(--mist)]/45 px-4 py-3 font-body text-sm leading-6 text-[var(--carbon)]" role="status" aria-live="polite">
                Your message was received. We&apos;ll follow up through the email address you provided.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-describedby={errorMessage ? 'contact-error' : undefined}>
              <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-2 block font-body text-sm font-bold text-[var(--carbon)]">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    autoComplete="name"
                    className="min-h-11 w-full border border-[var(--carbon)]/35 bg-[var(--off-white)] px-4 py-3 font-body text-[var(--carbon)] placeholder:text-[var(--carbon)]/45 outline-none transition focus-visible:border-[var(--ultramarine)] focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]"
                    required
                    disabled={isSending}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-2 block font-body text-sm font-bold text-[var(--carbon)]">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="min-h-11 w-full border border-[var(--carbon)]/35 bg-[var(--off-white)] px-4 py-3 font-body text-[var(--carbon)] placeholder:text-[var(--carbon)]/45 outline-none transition focus-visible:border-[var(--ultramarine)] focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]"
                    required
                    disabled={isSending}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="mb-2 block font-body text-sm font-bold text-[var(--carbon)]">What can we help with?</label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleSubjectChange}
                  className="min-h-11 w-full border border-[var(--carbon)]/35 bg-[var(--off-white)] px-4 py-3 font-body text-[var(--carbon)] outline-none transition focus-visible:border-[var(--ultramarine)] focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]"
                  required
                  disabled={isSending}
                >
                  {subjectOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {isWorkshop && (
                <div className="grid gap-5 border-l-2 border-[var(--ultramarine)] pl-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="schoolName" className="mb-2 block font-body text-sm font-bold text-[var(--carbon)]">School or organization</label>
                    <input
                      type="text"
                      id="schoolName"
                      name="schoolName"
                      value={formData.schoolName}
                      onChange={handleChange}
                      autoComplete="organization"
                      placeholder="School, club, or organization"
                      className="min-h-11 w-full border border-[var(--carbon)]/35 bg-[var(--off-white)] px-4 py-3 font-body text-[var(--carbon)] placeholder:text-[var(--carbon)]/45 outline-none transition focus-visible:border-[var(--ultramarine)] focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]"
                      required={isWorkshop}
                      disabled={isSending}
                    />
                  </div>
                  <div>
                    <label htmlFor="studentCount" className="mb-2 block font-body text-sm font-bold text-[var(--carbon)]">Estimated students</label>
                    <input
                      type="number"
                      id="studentCount"
                      name="studentCount"
                      value={formData.studentCount}
                      onChange={handleChange}
                      inputMode="numeric"
                      min="1"
                      step="1"
                      placeholder="Approximate number"
                      className="min-h-11 w-full border border-[var(--carbon)]/35 bg-[var(--off-white)] px-4 py-3 font-body text-[var(--carbon)] placeholder:text-[var(--carbon)]/45 outline-none transition focus-visible:border-[var(--ultramarine)] focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]"
                      required={isWorkshop}
                      disabled={isSending}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="message" className="mb-2 block font-body text-sm font-bold text-[var(--carbon)]">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your idea, question, or event."
                  rows={7}
                  className="min-h-11 w-full resize-y border border-[var(--carbon)]/35 bg-[var(--off-white)] px-4 py-3 font-body text-[var(--carbon)] placeholder:text-[var(--carbon)]/45 outline-none transition focus-visible:border-[var(--ultramarine)] focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]"
                  required
                  disabled={isSending}
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--carbon)] px-6 py-3 font-body font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bone)] ${buttonClass}`}
              >
                {status === 'success' ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <Mail aria-hidden="true" className="h-4 w-4" />}
                {buttonLabel}
              </button>
            </form>

            <p className="mt-5 font-body text-sm leading-6 text-[var(--carbon)]/65">
              Looking for equipment? Visit the{' '}
              <Link href="/wishlist" className="font-bold text-[var(--ultramarine)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-orange)]">wishlist</Link>.
            </p>
          </section>
        </div>
      </section>
    </div>
  )
}
