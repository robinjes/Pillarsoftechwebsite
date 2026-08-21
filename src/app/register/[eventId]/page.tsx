'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, LoaderCircle, Send } from 'lucide-react'
import type { FormField } from '@/lib/content-contracts'

type FormResponse = {
  eventId: string
  kind: 'participant'
  fields: FormField[]
  isActive: boolean
}

type Answer = string | boolean

function responseMessage(status: number): string {
  if (status === 404) return 'This event does not have an active participant registration form.'
  if (status === 409) return 'Registration for this event is currently closed or full.'
  if (status >= 500) return 'Registration is temporarily unavailable. Please try again shortly.'
  return 'The registration form could not be loaded. Please try again.'
}

function submissionMessage(status: number): string {
  if (status === 404) return 'This event is no longer available for registration.'
  if (status === 409) return 'Registration is currently closed or full.'
  if (status >= 500) return 'Registration is temporarily unavailable. Please try again shortly.'
  return 'Please check the form and try again.'
}

function initialAnswers(fields: FormField[]): Record<string, Answer> {
  return Object.fromEntries(fields.map((field) => [field.id, field.type === 'checkbox' ? false : '']))
}

export default function RegisterPage() {
  const params = useParams<{ eventId: string | string[] }>()
  const eventId = Array.isArray(params?.eventId) ? params.eventId[0] : params?.eventId || ''
  const [formSchema, setFormSchema] = useState<FormResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, Answer>>({})
  const [honeypot, setHoneypot] = useState('')

  useEffect(() => {
    let mounted = true

    const fetchForm = async () => {
      if (!eventId) {
        setError('This event could not be identified.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/forms?eventId=${encodeURIComponent(eventId)}`)
        if (!response.ok) throw new Error(responseMessage(response.status))
        const data = (await response.json()) as FormResponse
        if (!data.isActive || !Array.isArray(data.fields)) {
          throw new Error('Registration for this event is currently closed.')
        }
        if (!mounted) return
        setFormSchema(data)
        setFormData(initialAnswers(data.fields))
      } catch (requestError: unknown) {
        if (!mounted) return
        setError(requestError instanceof Error ? requestError.message : 'The registration form could not be loaded.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void fetchForm()
    return () => {
      mounted = false
    }
  }, [eventId])

  const getFormValue = (id: string): string => {
    const value = formData[id]
    return typeof value === 'string' ? value : ''
  }

  const handleInputChange = (id: string, value: Answer) => {
    setFormData((previous) => ({ ...previous, [id]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/registrations/participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, answers: formData, honeypot }),
      })
      if (!response.ok) throw new Error(submissionMessage(response.status))
      setSuccess(true)
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : 'Registration could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  const formReady = Boolean(formSchema?.isActive && formSchema.fields.length > 0)
  const pageKicker = useMemo(() => (success ? 'Registration received' : 'Participant registration'), [success])

  return (
    <main className="min-h-screen bg-[var(--bone)] pb-20 pt-12 text-[var(--carbon)] selection:bg-[var(--cream)] sm:pt-16">
      <div className="signal-shell">
        <Link
          href="/events"
          className="signal-text-link inline-flex min-h-11 items-center gap-2 py-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to events
        </Link>

        <header className="mt-7 border-y border-[var(--ink)] bg-[var(--carbon)] px-5 py-10 text-[var(--off-white)] sm:px-10 sm:py-14">
          <p className="signal-mono signal-eyebrow">{pageKicker}</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.94] tracking-[-0.05em] sm:text-[4.35rem]">Save your place in the room.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--off-white)]/72">
            Share the details we need for this event. Your answers are sent only to the registration record for the selected program.
          </p>
        </header>

        {loading ? (
          <div className="border-b border-[var(--carbon)] py-16" role="status">
            <LoaderCircle className="h-8 w-8 animate-spin text-[var(--ultramarine)] motion-reduce:animate-none" aria-hidden="true" />
            <p className="mt-4 font-display text-2xl text-[var(--carbon)]">Loading the registration form…</p>
          </div>
        ) : error ? (
          <div className="border-b border-[var(--carbon)] py-16" role="alert">
            <p className="font-display text-3xl text-[var(--carbon)]">Registration is not available.</p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--carbon)]/72">{error}</p>
            <Link
              href="/events"
              className="signal-button signal-button--orange mt-7"
            >
              Browse other events <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
            </Link>
          </div>
        ) : success ? (
          <section className="border-b border-[var(--carbon)] py-16" aria-live="polite">
            <div className="flex h-12 w-12 items-center justify-center bg-[var(--signal-orange)] text-[var(--carbon)]">
              <Check className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-6 font-display text-4xl text-[var(--carbon)]">You&apos;re on the list.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--carbon)]/72">
              Your registration was received. Keep the event details handy, and return to the events archive for more programs.
            </p>
            <Link
              href="/events"
              className="signal-button signal-button--line mt-7"
            >
              Return to events <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
            </Link>
          </section>
        ) : !formReady ? (
          <section className="border-b border-[var(--carbon)] py-16">
            <h2 className="font-display text-3xl text-[var(--carbon)]">The form has no questions yet.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--carbon)]/72">Check the event page for updates or contact the Pillars of Tech team.</p>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="border-b border-[var(--carbon)] py-10 sm:py-14" noValidate={false}>
            <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
              {formSchema?.fields.map((field) => {
                const fieldLabel = (
                  <span className="block text-sm font-bold text-[var(--midnight)]">
                    {field.label}{field.required ? <span className="ml-1 text-[var(--cobalt)]" aria-hidden="true">*</span> : null}
                    {field.required ? <span className="sr-only"> (required)</span> : null}
                  </span>
                )

                if (field.type === 'checkbox') {
                  return (
                    <label key={field.id} htmlFor={field.id} className="flex min-h-11 items-start gap-3 border border-[var(--carbon)] bg-[var(--off-white)] p-4 sm:col-span-2">
                      <input
                        id={field.id}
                        name={field.id}
                        type="checkbox"
                        required={field.required}
                        checked={Boolean(formData[field.id])}
                        onChange={(event) => handleInputChange(field.id, event.target.checked)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--cobalt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
                      />
                      <span>{fieldLabel}<span className="mt-1 block text-sm font-normal leading-6 text-[var(--ink)]/75">{field.consent ? 'I understand and consent to the event information being used for this registration.' : ''}</span></span>
                    </label>
                  )
                }

                if (field.type === 'radio') {
                  return (
                    <fieldset key={field.id} className="space-y-3">
                      <legend>{fieldLabel}</legend>
                      <div className="space-y-2 border-l-2 border-[var(--cobalt)] pl-4">
                        {field.options?.map((option) => (
                          <label key={option} className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                            <input
                              type="radio"
                              name={field.id}
                              value={option}
                              required={field.required}
                              checked={formData[field.id] === option}
                              onChange={() => handleInputChange(field.id, option)}
                              className="h-5 w-5 accent-[var(--cobalt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cobalt)]"
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )
                }

                const commonClass = 'mt-2 min-h-11 w-full border border-[var(--carbon)] bg-[var(--off-white)] px-4 py-3 text-sm text-[var(--carbon)] placeholder:text-[var(--carbon)]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ultramarine)]'
                return (
                  <div key={field.id}>
                    <label htmlFor={field.id}>{fieldLabel}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.id}
                        name={field.id}
                        required={field.required}
                        rows={5}
                        value={getFormValue(field.id)}
                        onChange={(event) => handleInputChange(field.id, event.target.value)}
                        className={`${commonClass} min-h-32 resize-y`}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        id={field.id}
                        name={field.id}
                        required={field.required}
                        value={getFormValue(field.id)}
                        onChange={(event) => handleInputChange(field.id, event.target.value)}
                        className={commonClass}
                      >
                        <option value="">Select an option</option>
                        {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        id={field.id}
                        name={field.id}
                        type={field.type}
                        required={field.required}
                        value={getFormValue(field.id)}
                        onChange={(event) => handleInputChange(field.id, event.target.value)}
                        className={commonClass}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
            </div>

            {error ? <p className="mt-8 border-l-2 border-[var(--signal-orange)] bg-[var(--mist)] p-4 text-sm font-semibold leading-6 text-[var(--carbon)]" role="alert">{error}</p> : null}

            <div className="mt-10 flex flex-col gap-4 border-t border-[var(--carbon)]/30 pt-7 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-6 text-[var(--carbon)]/65">Fields marked with an asterisk are required. Please submit one registration per participant.</p>
              <button
                type="submit"
                disabled={submitting}
                className="signal-button signal-button--orange disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? <><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Sending…</> : <><Send className="h-4 w-4" aria-hidden="true" /> Send registration</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
