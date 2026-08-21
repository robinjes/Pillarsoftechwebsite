'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'

import type { EventRecord, FormDefinition } from '@/lib/content-contracts'

type ParticipantRegistration = {
  confirmationId: string
  eventId: string
  createdAt: string
  answers: Record<string, string | boolean>
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value || 'Unknown time'
}

const answerText = (value: string | boolean) => typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value

export default function AdminRegistrations() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [eventId, setEventId] = useState('')
  const [registrations, setRegistrations] = useState<ParticipantRegistration[]>([])
  const [form, setForm] = useState<FormDefinition | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadRecords = async (nextEventId: string) => {
    if (!nextEventId) {
      setRegistrations([])
      setForm(null)
      return
    }

    setRecordsLoading(true)
    setError('')
    try {
      const [registrationResponse, formResponse] = await Promise.all([
        fetch(`/api/admin/registrations/participants?eventId=${encodeURIComponent(nextEventId)}`, { cache: 'no-store' }),
        fetch(`/api/admin/forms?eventId=${encodeURIComponent(nextEventId)}&kind=participant`, { cache: 'no-store' }),
      ])
      const registrationResult = await registrationResponse.json().catch(() => ({}))
      const formResult = await formResponse.json().catch(() => ({}))
      if (!registrationResponse.ok) throw new Error(registrationResult.error || 'Participant registrations could not be loaded.')
      if (!formResponse.ok) throw new Error(formResult.error || 'Registration form could not be loaded.')
      const nextForm = Array.isArray(formResult.forms) ? formResult.forms[0] as FormDefinition | undefined : undefined
      const nextRegistrations = Array.isArray(registrationResult.registrations) ? registrationResult.registrations as ParticipantRegistration[] : []
      setForm(nextForm ?? null)
      setRegistrations(nextRegistrations)
    } catch (loadError) {
      setForm(null)
      setRegistrations([])
      setError(loadError instanceof Error ? loadError.message : 'Participant registrations could not be loaded.')
    } finally {
      setRecordsLoading(false)
    }
  }

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/admin/events', { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || 'Events could not be loaded.')
        const nextEvents = Array.isArray(result.events) ? result.events as EventRecord[] : []
        setEvents(nextEvents)
        const firstEventId = nextEvents[0]?.id ?? ''
        setEventId(firstEventId)
        if (firstEventId) await loadRecords(firstEventId)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Events could not be loaded.')
      } finally {
        setLoading(false)
      }
    }
    void loadEvents()
  }, [])

  const fieldLabels = useMemo(() => new Map((form?.fields ?? []).map((field) => [field.id, field.label])), [form])
  const normalizedSearch = search.trim().toLowerCase()
  const filteredRegistrations = useMemo(() => registrations.filter((registration) => {
    if (!normalizedSearch) return true
    const searchable = [
      registration.confirmationId,
      registration.createdAt,
      ...Object.entries(registration.answers).flatMap(([key, value]) => [fieldLabels.get(key) ?? key, answerText(value)]),
    ].join(' ').toLowerCase()
    return searchable.includes(normalizedSearch)
  }), [fieldLabels, normalizedSearch, registrations])

  return (
    <section className="space-y-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">Participant registrations</h1><p className="mt-1 text-sm text-blue-200">Review submitted participant answers for one event at a time.</p></div>{eventId ? <a href={`/api/admin/exports/participant-registrations?eventId=${encodeURIComponent(eventId)}`} className="inline-flex min-h-11 items-center gap-2 rounded border border-white/20 px-4 py-2 text-sm font-semibold text-white" download><Download className="h-4 w-4" aria-hidden="true" />Download CSV</a> : null}</div>
      {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-rose-100">{error}</p>}
      {loading ? <p className="text-blue-200">Loading events…</p> : events.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-blue-200">No events found.</p> : <div className="space-y-5 rounded-xl border border-white/10 bg-slate-900/60 p-5">
        <label className="block space-y-1 text-sm">Event<select value={eventId} onChange={(event) => { setEventId(event.target.value); setSearch(''); void loadRecords(event.target.value) }} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2">{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
        <label className="block space-y-1 text-sm">Search registrations<div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-blue-200" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search confirmation ID or submitted answers" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 py-2 pl-10 pr-3" /></div></label>
        {recordsLoading ? <p className="text-blue-200" aria-live="polite">Loading registrations…</p> : registrations.length === 0 ? <p className="rounded border border-dashed border-white/15 p-6 text-center text-blue-200">No participant registrations have been submitted for this event.</p> : filteredRegistrations.length === 0 ? <p className="rounded border border-dashed border-white/15 p-6 text-center text-blue-200">No registrations match this search.</p> : <div className="space-y-4" aria-live="polite">{filteredRegistrations.map((registration) => <article key={registration.confirmationId} className="rounded-lg border border-white/10 bg-slate-800/60 p-4"><div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3"><h2 className="font-semibold">{registration.confirmationId}</h2><time className="text-sm text-blue-200" dateTime={registration.createdAt}>{formatDateTime(registration.createdAt)}</time></div><dl className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(registration.answers).map(([key, value]) => <div key={key}><dt className="text-xs font-semibold uppercase tracking-wide text-blue-200">{fieldLabels.get(key) ?? key}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{answerText(value) || '—'}</dd></div>)}</dl></article>)}</div>}
      </div>}
    </section>
  )
}
