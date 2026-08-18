'use client'

import { useEffect, useState } from 'react'
import { Calendar, Edit2, Plus, Trash2, X } from 'lucide-react'

import type { EventRecord, EventWrite } from '@/lib/content-contracts'

const blankEvent: EventWrite = {
  title: '',
  summary: '',
  description: '',
  startsAt: null,
  endsAt: null,
  timezone: 'America/New_York',
  startLabel: '',
  endLabel: '',
  location: '',
  programCategory: 'general',
  status: 'upcoming',
  media: { gallery: [], youtubeVideos: [] },
  resources: {},
  participantRegistrationState: 'closed',
  volunteerRegistrationState: 'closed',
  participantCapacity: null,
  volunteerCapacity: null,
  outcomes: {},
  publicationState: 'unpublished',
}

function eventToDraft(event: EventRecord): EventWrite {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    startLabel: event.startLabel,
    endLabel: event.endLabel,
    location: event.location,
    programCategory: event.programCategory,
    status: event.status,
    media: event.media,
    resources: event.resources,
    participantRegistrationState: event.participantRegistrationState,
    volunteerRegistrationState: event.volunteerRegistrationState,
    participantCapacity: event.participantCapacity,
    volunteerCapacity: event.volunteerCapacity,
    outcomes: event.outcomes,
    publicationState: event.publicationState,
  }
}

export default function AdminEvents() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [draft, setDraft] = useState<EventWrite>(blankEvent)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadEvents = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/events', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Events could not be loaded.')
      setEvents(Array.isArray(result.events) ? result.events : [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Events could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadEvents() }, [])

  const setField = <K extends keyof EventWrite>(key: K, value: EventWrite[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(editingId ? `/api/admin/events?id=${encodeURIComponent(editingId)}` : '/api/admin/events', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Event could not be saved.')
      setMessage('Event saved.')
      setDraft(blankEvent)
      setEditingId(null)
      await loadEvents()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Event could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const changeState = async (id: string, action: 'publish' | 'unpublish' | 'archive') => {
    setError('')
    try {
      const response = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Event state could not be changed.')
      await loadEvents()
    } catch (stateError) {
      setError(stateError instanceof Error ? stateError.message : 'Event state could not be changed.')
    }
  }

  const deleteEvent = async (id: string) => {
    if (!window.confirm('Delete this event?')) return
    try {
      const response = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Event could not be deleted.')
      await loadEvents()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Event could not be deleted.')
    }
  }

  return (
    <section className="space-y-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="mt-1 text-sm text-blue-200">Manage validated event content and publication state.</p>
        </div>
        <button type="button" onClick={() => { setDraft(blankEvent); setEditingId(null); setMessage('') }} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-slate-900">
          <Plus className="h-4 w-4" /> New event
        </button>
      </div>

      {message && <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">{message}</p>}
      {error && <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-rose-100">{error}</p>}

      <form onSubmit={saveEvent} className="grid gap-4 rounded-xl border border-white/10 bg-slate-900/60 p-5 md:grid-cols-2">
        <div className="md:col-span-2 flex items-center justify-between"><h2 className="text-xl font-semibold">{editingId ? 'Edit event' : 'Create event'}</h2>{editingId && <button type="button" onClick={() => { setDraft(blankEvent); setEditingId(null) }}><X className="h-5 w-5" /></button>}</div>
        <label className="space-y-1 text-sm">Title<input required value={draft.title} onChange={(event) => setField('title', event.target.value)} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Program category<input required value={draft.programCategory} onChange={(event) => setField('programCategory', event.target.value)} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Date label<input value={draft.startLabel} onChange={(event) => setField('startLabel', event.target.value)} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Time label<input value={draft.endLabel} onChange={(event) => setField('endLabel', event.target.value)} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Location<input value={draft.location} onChange={(event) => setField('location', event.target.value)} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Status<select value={draft.status} onChange={(event) => setField('status', event.target.value as EventWrite['status'])} className="w-full rounded border border-white/10 bg-slate-800 p-2"><option value="draft">Draft</option><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <label className="space-y-1 text-sm">Publication<select value={draft.publicationState} onChange={(event) => setField('publicationState', event.target.value as EventWrite['publicationState'])} className="w-full rounded border border-white/10 bg-slate-800 p-2"><option value="unpublished">Unpublished</option><option value="published">Published</option></select></label>
        <label className="space-y-1 text-sm">Participant registration<select value={draft.participantRegistrationState} onChange={(event) => setField('participantRegistrationState', event.target.value as EventWrite['participantRegistrationState'])} className="w-full rounded border border-white/10 bg-slate-800 p-2"><option value="closed">Closed</option><option value="open">Open</option><option value="full">Full</option></select></label>
        <label className="space-y-1 text-sm md:col-span-2">Summary<textarea value={draft.summary} onChange={(event) => setField('summary', event.target.value)} rows={2} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm md:col-span-2">Description<textarea value={draft.description} onChange={(event) => setField('description', event.target.value)} rows={6} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Local/approved image URL<input value={draft.media.image ?? ''} onChange={(event) => setField('media', { ...draft.media, image: event.target.value || undefined })} placeholder="/images/events/..." className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Approved video URL<input value={draft.media.heroVideo ?? ''} onChange={(event) => setField('media', { ...draft.media, heroVideo: event.target.value || undefined })} placeholder="https://www.youtube.com/..." className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <div className="md:col-span-2"><button disabled={saving} className="rounded-lg bg-accent px-5 py-2 font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Save event'}</button></div>
      </form>

      <div className="space-y-3">
        {loading ? <p className="text-blue-200">Loading events…</p> : events.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-blue-200">No events found.</p> : events.map((event) => (
          <article key={event.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{event.title}</h3><p className="text-sm text-blue-200"><Calendar className="mr-1 inline h-4 w-4" />{event.startLabel || 'No date'} · {event.status} · {event.publicationState}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setDraft(eventToDraft(event)); setEditingId(event.id) }} className="inline-flex items-center gap-1 rounded border border-white/15 px-3 py-1 text-sm"><Edit2 className="h-4 w-4" />Edit</button><button type="button" onClick={() => void changeState(event.id, event.publicationState === 'published' ? 'unpublish' : 'publish')} className="rounded border border-white/15 px-3 py-1 text-sm">{event.publicationState === 'published' ? 'Unpublish' : 'Publish'}</button><button type="button" onClick={() => void changeState(event.id, 'archive')} className="rounded border border-white/15 px-3 py-1 text-sm">Archive</button><button type="button" onClick={() => void deleteEvent(event.id)} className="rounded border border-rose-300/30 px-3 py-1 text-sm text-rose-100"><Trash2 className="h-4 w-4" /></button></div></div>
          </article>
        ))}
      </div>
    </section>
  )
}
