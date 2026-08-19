'use client'

import { useEffect, useState } from 'react'
import { Calendar, Edit2, Plus, Trash2, Upload, X } from 'lucide-react'

import type { EventRecord, EventWrite } from '@/lib/content-contracts'
import { supabase } from '@/lib/supabase/client'

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
  media: { gallery: [], galleryAlts: [], youtubeVideos: [] },
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
  const [uploadKind, setUploadKind] = useState<'image' | 'document' | 'video'>('image')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')

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

  const uploadMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setUploadMessage('Checking file and requesting a secure upload…')
    setError('')

    try {
      if (!supabase) throw new Error('Browser Supabase configuration is unavailable.')
      const signResponse = await fetch('/api/admin/media/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      })
      const signResult = await signResponse.json().catch(() => ({}))
      if (!signResponse.ok) throw new Error(signResult.message || signResult.error || 'Media upload could not be started.')

      setUploadMessage('Uploading directly to private storage…')
      const { error: uploadError } = await supabase.storage
        .from(signResult.upload.bucket)
        .uploadToSignedUrl(signResult.upload.path, signResult.upload.token, file, {
          contentType: file.type,
          upsert: false,
        })
      if (uploadError) throw new Error('The direct storage upload failed.')

      setUploadMessage('Validating, sanitizing, and finalizing…')
      const finalizeResponse = await fetch('/api/admin/media/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: signResult.media.id }),
      })
      const finalizeResult = await finalizeResponse.json().catch(() => ({}))
      if (!finalizeResponse.ok) throw new Error(finalizeResult.message || finalizeResult.error || 'Media finalization failed.')

      const finalUrl = uploadKind === 'document' ? `/api/media/${finalizeResult.media.id}` : finalizeResult.url
      if (uploadKind === 'image') {
        setDraft((current) => ({ ...current, media: { ...current.media, image: finalUrl, heroImage: finalUrl } }))
      } else if (uploadKind === 'video') {
        setDraft((current) => ({ ...current, media: { ...current.media, heroVideo: finalUrl } }))
      } else {
        setDraft((current) => ({ ...current, resources: { ...current.resources, pdfUrl: finalUrl } }))
      }
      setUploadMessage(`Finalized ${file.name}. Save the event to keep this approved media reference.`)
    } catch (uploadError) {
      setUploadMessage('')
      setError(uploadError instanceof Error ? uploadError.message : 'Media upload failed.')
    } finally {
      setUploading(false)
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
        <label className="space-y-1 text-sm">Primary image alt text<input maxLength={500} value={draft.media.imageAlt ?? ''} onChange={(event) => setField('media', { ...draft.media, imageAlt: event.target.value || undefined })} placeholder="Describe the primary event image" className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Hero image alt text<input maxLength={500} value={draft.media.heroImageAlt ?? ''} onChange={(event) => setField('media', { ...draft.media, heroImageAlt: event.target.value || undefined })} placeholder="Describe the hero event image" className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Approved video URL<input value={draft.media.heroVideo ?? ''} onChange={(event) => setField('media', { ...draft.media, heroVideo: event.target.value || undefined })} placeholder="https://www.youtube.com/..." className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        {(draft.media.gallery ?? []).length > 0 ? (
          <fieldset className="space-y-3 rounded-lg border border-white/10 p-4 md:col-span-2">
            <legend className="px-1 text-sm font-semibold">Gallery image alt text</legend>
            <p className="text-xs text-blue-200">Add one optional description for each existing gallery image. Leave a field blank when the title fallback is sufficient.</p>
            {(draft.media.gallery ?? []).map((image, index) => (
              <label key={`${image}-${index}`} className="block space-y-1 text-sm">
                Gallery image {index + 1} alt text
                <input
                  maxLength={500}
                  value={draft.media.galleryAlts?.[index] ?? ''}
                  onChange={(event) => {
                    const galleryAlts = [...(draft.media.galleryAlts ?? [])]
                    galleryAlts[index] = event.target.value
                    setField('media', { ...draft.media, galleryAlts })
                  }}
                  placeholder={`Describe gallery image ${index + 1}`}
                  className="w-full rounded border border-white/10 bg-slate-800 p-2"
                />
              </label>
            ))}
          </fieldset>
        ) : null}
        <div className="md:col-span-2 rounded-lg border border-cyan-300/20 bg-cyan-400/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm">Approved media type<select value={uploadKind} onChange={(event) => setUploadKind(event.target.value as typeof uploadKind)} className="ml-2 rounded border border-white/10 bg-slate-800 p-2"><option value="image">Image</option><option value="video">Video</option><option value="document">Private PDF</option></select></label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm font-semibold hover:bg-cyan-300/10">
              <Upload className="h-4 w-4" />
              {uploading ? 'Processing…' : 'Choose and upload'}
              <input type="file" className="sr-only" disabled={uploading} accept={uploadKind === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : uploadKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'application/pdf'} onChange={(event) => void uploadMedia(event)} />
            </label>
          </div>
          <p className="mt-2 text-xs text-blue-200">Files are checked again on the server; picker filters are only a convenience.</p>
          {uploadMessage && <p className="mt-2 text-sm text-cyan-100">{uploadMessage}</p>}
        </div>
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
