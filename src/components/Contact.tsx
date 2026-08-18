'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, CheckCircle2, Mail, MessageCircle, Send } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

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
  const resetTimer = useRef<number | null>(null)

  useEffect(() => {
    if (searchParams.get('reason') === 'wishlist') {
      setFormData((currentValue) => ({ ...currentValue, subject: 'wishlist' }))
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
          honeypot: '',
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'We could not send that message. Please check the form or email us directly.')
      }

      setStatus('success')
      setFormData({ name: '', email: '', subject: 'general', schoolName: '', studentCount: '', message: '' })
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
    ? 'cursor-not-allowed bg-[var(--ink)]/30 text-[var(--ink)]/50'
    : status === 'success'
      ? 'bg-[var(--cobalt)] text-[var(--cream)]'
      : status === 'error'
        ? 'bg-red-700 text-[var(--cream)] hover:bg-red-800'
        : 'bg-[var(--midnight)] text-[var(--cream)] hover:bg-[var(--cobalt)]'

  return (
    <div className="bg-[var(--cream)] text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)]/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-12 lg:py-28">
          <div>
            <div className="mb-6 flex items-center gap-3 font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">
              <MessageCircle aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              Contact / Start here
            </div>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.96] tracking-tight text-[var(--midnight)] sm:text-7xl lg:text-[6.8rem]">
              Let&apos;s make the next step clear.
            </h1>
            <p className="mt-7 max-w-2xl font-body text-lg leading-8 text-[var(--ink)]/70 sm:text-xl">
              Tell us what you are working on, what you want to ask, or where you would like to help.
            </p>
          </div>
          <div className="border-l-4 border-[var(--cobalt)] pl-6">
            <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Direct line</p>
            <p className="mt-4 font-display text-3xl leading-tight text-[var(--midnight)]">Prefer email?</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 border-b-2 border-[var(--cobalt)] pb-1 font-body font-bold text-[var(--cobalt)] transition hover:border-[var(--midnight)] hover:text-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--cream)]"
            >
              {CONTACT_EMAIL}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-12 lg:py-24">
          <aside>
            <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Conversation starters</p>
            <h2 className="mt-4 max-w-sm font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Bring the useful details.</h2>
            <p className="mt-5 max-w-sm font-body text-base leading-7 text-[var(--ink)]/65">
              Choose a subject and include the context that will help us understand what you need.
            </p>
            <ul className="mt-8 divide-y divide-[var(--ink)]/20 border-y border-[var(--ink)]/20 font-body text-sm font-semibold text-[var(--midnight)]">
              {inquiryHighlights.map((item) => (
                <li key={item} className="flex items-start gap-3 py-4">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[var(--cobalt)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-l-2 border-[var(--sky)] pl-4 font-body text-sm leading-6 text-[var(--ink)]/65">
              For an event request, include the date, location, and any relevant constraints.
            </p>
          </aside>

          <section id="contact-form" className="border-2 border-[var(--ink)]/25 bg-[var(--cream)] p-5 sm:p-8">
            <div className="flex flex-col gap-5 border-b-2 border-[var(--ink)] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Message form</p>
                <h2 className="mt-3 font-display text-3xl leading-tight text-[var(--midnight)] sm:text-4xl">Send a note.</h2>
              </div>
              <Send aria-hidden="true" className="h-7 w-7 text-[var(--cobalt)]" strokeWidth={1.7} />
            </div>

            {errorMessage && (
              <div id="contact-error" className="mt-6 border-l-4 border-red-700 bg-red-100 px-4 py-3 font-body text-sm leading-6 text-red-950" role="alert" aria-live="polite">
                {errorMessage}
              </div>
            )}

            {status === 'success' && (
              <div className="mt-6 border-l-4 border-[var(--cobalt)] bg-[var(--sky)]/35 px-4 py-3 font-body text-sm leading-6 text-[var(--midnight)]" role="status" aria-live="polite">
                Your message was received. We&apos;ll follow up through the email address you provided.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-describedby={errorMessage ? 'contact-error' : undefined}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-2 block font-body text-sm font-bold text-[var(--midnight)]">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    autoComplete="name"
                    className="min-h-11 w-full rounded-md border-2 border-[var(--ink)]/25 bg-[var(--paper)] px-4 py-3 font-body text-[var(--ink)] placeholder:text-[var(--ink)]/45 outline-none transition focus-visible:border-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)]"
                    required
                    disabled={isSending}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-2 block font-body text-sm font-bold text-[var(--midnight)]">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="min-h-11 w-full rounded-md border-2 border-[var(--ink)]/25 bg-[var(--paper)] px-4 py-3 font-body text-[var(--ink)] placeholder:text-[var(--ink)]/45 outline-none transition focus-visible:border-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)]"
                    required
                    disabled={isSending}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="mb-2 block font-body text-sm font-bold text-[var(--midnight)]">What can we help with?</label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleSubjectChange}
                  className="min-h-11 w-full rounded-md border-2 border-[var(--ink)]/25 bg-[var(--paper)] px-4 py-3 font-body text-[var(--ink)] outline-none transition focus-visible:border-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)]"
                  required
                  disabled={isSending}
                >
                  {subjectOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {isWorkshop && (
                <div className="grid gap-5 border-l-2 border-[var(--sky)] pl-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="schoolName" className="mb-2 block font-body text-sm font-bold text-[var(--midnight)]">School or organization</label>
                    <input
                      type="text"
                      id="schoolName"
                      name="schoolName"
                      value={formData.schoolName}
                      onChange={handleChange}
                      autoComplete="organization"
                      placeholder="School, club, or organization"
                      className="min-h-11 w-full rounded-md border-2 border-[var(--ink)]/25 bg-[var(--paper)] px-4 py-3 font-body text-[var(--ink)] placeholder:text-[var(--ink)]/45 outline-none transition focus-visible:border-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)]"
                      required={isWorkshop}
                      disabled={isSending}
                    />
                  </div>
                  <div>
                    <label htmlFor="studentCount" className="mb-2 block font-body text-sm font-bold text-[var(--midnight)]">Estimated students</label>
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
                      className="min-h-11 w-full rounded-md border-2 border-[var(--ink)]/25 bg-[var(--paper)] px-4 py-3 font-body text-[var(--ink)] placeholder:text-[var(--ink)]/45 outline-none transition focus-visible:border-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)]"
                      required={isWorkshop}
                      disabled={isSending}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="message" className="mb-2 block font-body text-sm font-bold text-[var(--midnight)]">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your idea, question, or event."
                  rows={7}
                  className="min-h-11 w-full resize-y rounded-md border-2 border-[var(--ink)]/25 bg-[var(--paper)] px-4 py-3 font-body text-[var(--ink)] placeholder:text-[var(--ink)]/45 outline-none transition focus-visible:border-[var(--cobalt)] focus-visible:ring-2 focus-visible:ring-[var(--sky)]"
                  required
                  disabled={isSending}
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-6 py-3 font-body font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)] ${buttonClass}`}
              >
                {status === 'success' ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <Mail aria-hidden="true" className="h-4 w-4" />}
                {buttonLabel}
              </button>
            </form>

            <p className="mt-5 font-body text-sm leading-6 text-[var(--ink)]/65">
              Looking for equipment? Visit the{' '}
              <Link href="/wishlist" className="font-bold text-[var(--cobalt)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)]">wishlist</Link>.
            </p>
          </section>
        </div>
      </section>
    </div>
  )
}
