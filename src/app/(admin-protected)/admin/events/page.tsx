'use client'

import { useEffect, useState } from 'react'
import { Calendar, Edit2, Plus, Trash2, Upload, X } from 'lucide-react'

import type { EventRecord, EventWrite } from '@/lib/content-contracts'
import { supabase } from '@/lib/supabase/client'

type GalleryRow = { url: string; alt: string }
type ResourceRow = { url: string }
type OutcomeRow = { key: string; value: string }

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

const dateTimeLocalValue = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const isoDateTimeValue = (value: string) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

const positiveIntegerOrNull = (value: string) => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const galleryRowsFromMedia = (media: EventWrite['media']): GalleryRow[] =>
  (media.gallery ?? []).map((url, index) => ({ url, alt: media.galleryAlts?.[index] ?? '' }))

const resourceRowsFromMedia = (media: EventWrite['media']): ResourceRow[] =>
  (media.youtubeVideos ?? []).map((url) => ({ url }))

const outcomeRowsFromEvent = (outcomes: EventWrite['outcomes']): OutcomeRow[] =>
  Object.entries(outcomes).map(([key, value]) => ({ key, value }))

const mediaWithGalleryRows = (media: EventWrite['media'], rows: GalleryRow[]): EventWrite['media'] => {
  const populatedRows = rows.filter((row) => row.url.trim().length > 0)
  return {
    ...media,
    gallery: populatedRows.map((row) => row.url),
    galleryAlts: populatedRows.map((row) => row.alt),
  }
}

const mediaWithResourceRows = (media: EventWrite['media'], rows: ResourceRow[]): EventWrite['media'] => ({
  ...media,
  youtubeVideos: rows.map((row) => row.url).filter((url) => url.trim().length > 0),
})

const outcomesFromRows = (rows: OutcomeRow[]): EventWrite['outcomes'] =>
  Object.fromEntries(
    rows
      .map((row) => [row.key.trim(), row.value.trim()] as const)
      .filter(([key]) => key.length > 0),
  )

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
  const [imageAssignment, setImageAssignment] = useState<'primary' | 'gallery'>('primary')
  const [galleryRows, setGalleryRows] = useState<GalleryRow[]>(() => galleryRowsFromMedia(blankEvent.media))
  const [youtubeRows, setYoutubeRows] = useState<ResourceRow[]>(() => resourceRowsFromMedia(blankEvent.media))
  const [outcomeRows, setOutcomeRows] = useState<OutcomeRow[]>(() => outcomeRowsFromEvent(blankEvent.outcomes))
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

  const resetEditor = (nextDraft: EventWrite = blankEvent) => {
    setDraft(nextDraft)
    setEditingId(null)
    setImageAssignment('primary')
    setGalleryRows(galleryRowsFromMedia(nextDraft.media))
    setYoutubeRows(resourceRowsFromMedia(nextDraft.media))
    setOutcomeRows(outcomeRowsFromEvent(nextDraft.outcomes))
  }

  const updateGalleryRows = (nextRows: GalleryRow[]) => {
    setGalleryRows(nextRows)
    setDraft((current) => ({ ...current, media: mediaWithGalleryRows(current.media, nextRows) }))
  }

  const updateYoutubeRows = (nextRows: ResourceRow[]) => {
    setYoutubeRows(nextRows)
    setDraft((current) => ({ ...current, media: mediaWithResourceRows(current.media, nextRows) }))
  }

  const updateOutcomeRows = (nextRows: OutcomeRow[]) => {
    setOutcomeRows(nextRows)
    setDraft((current) => ({ ...current, outcomes: outcomesFromRows(nextRows) }))
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
      resetEditor()
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
    if (uploadKind === 'image' && imageAssignment === 'gallery' && galleryRows.length >= 40) {
      setUploadMessage('The gallery already has the maximum of 40 images. Remove one before adding another.')
      return
    }
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

      const finalUrl = uploadKind === 'document' ? `/api/admin/media/${finalizeResult.media.id}` : finalizeResult.url
      if (uploadKind === 'image') {
        if (imageAssignment === 'gallery') {
          updateGalleryRows([...galleryRows, { url: finalUrl, alt: '' }])
        } else {
          setDraft((current) => ({ ...current, media: { ...current.media, image: finalUrl, heroImage: finalUrl } }))
        }
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
        <button type="button" onClick={() => { resetEditor(); setMessage('') }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-slate-900">
          <Plus className="h-4 w-4" /> New event
        </button>
      </div>

      {message && <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">{message}</p>}
      {error && <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-rose-100">{error}</p>}

      <form onSubmit={saveEvent} className="grid gap-4 rounded-xl border border-white/10 bg-slate-900/60 p-5 md:grid-cols-2">
        <div className="flex items-center justify-between md:col-span-2"><h2 className="text-xl font-semibold">{editingId ? 'Edit event' : 'Create event'}</h2>{editingId && <button type="button" onClick={() => { resetEditor(); setMessage('') }} aria-label="Cancel editing" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-white/15"><X className="h-5 w-5" /></button>}</div>
        <label className="space-y-1 text-sm">Title<input required value={draft.title} onChange={(event) => setField('title', event.target.value)} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Program category<input required value={draft.programCategory} onChange={(event) => setField('programCategory', event.target.value)} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Start date/time (ISO-backed)<input type="datetime-local" step="60" value={dateTimeLocalValue(draft.startsAt)} onChange={(event) => setField('startsAt', isoDateTimeValue(event.target.value))} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">End date/time (ISO-backed)<input type="datetime-local" step="60" value={dateTimeLocalValue(draft.endsAt)} onChange={(event) => setField('endsAt', isoDateTimeValue(event.target.value))} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Date label<input value={draft.startLabel} onChange={(event) => setField('startLabel', event.target.value)} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Time label<input value={draft.endLabel} onChange={(event) => setField('endLabel', event.target.value)} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Timezone (IANA)<input required value={draft.timezone} onChange={(event) => setField('timezone', event.target.value)} placeholder="America/New_York" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Location<input value={draft.location} onChange={(event) => setField('location', event.target.value)} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Status<select value={draft.status} onChange={(event) => setField('status', event.target.value as EventWrite['status'])} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2"><option value="draft">Draft</option><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <label className="space-y-1 text-sm">Publication<select value={draft.publicationState} onChange={(event) => setField('publicationState', event.target.value as EventWrite['publicationState'])} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2"><option value="unpublished">Unpublished</option><option value="published">Published</option></select></label>
        <label className="space-y-1 text-sm">Participant registration<select value={draft.participantRegistrationState} onChange={(event) => setField('participantRegistrationState', event.target.value as EventWrite['participantRegistrationState'])} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2"><option value="closed">Closed</option><option value="open">Open</option><option value="full">Full</option></select></label>
        <label className="space-y-1 text-sm">Volunteer registration<select value={draft.volunteerRegistrationState} onChange={(event) => setField('volunteerRegistrationState', event.target.value as EventWrite['volunteerRegistrationState'])} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2"><option value="closed">Closed</option><option value="open">Open</option><option value="full">Full</option></select></label>
        <label className="space-y-1 text-sm">Participant capacity<input type="number" min="1" step="1" inputMode="numeric" value={draft.participantCapacity ?? ''} onChange={(event) => setField('participantCapacity', positiveIntegerOrNull(event.target.value))} placeholder="No limit" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Volunteer capacity<input type="number" min="1" step="1" inputMode="numeric" value={draft.volunteerCapacity ?? ''} onChange={(event) => setField('volunteerCapacity', positiveIntegerOrNull(event.target.value))} placeholder="No limit" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm md:col-span-2">Summary<textarea value={draft.summary} onChange={(event) => setField('summary', event.target.value)} rows={2} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm md:col-span-2">Description<textarea value={draft.description} onChange={(event) => setField('description', event.target.value)} rows={6} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Primary image URL<input value={draft.media.image ?? ''} onChange={(event) => setField('media', { ...draft.media, image: event.target.value || undefined })} placeholder="/images/events/..." className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Primary image alt text<input maxLength={500} value={draft.media.imageAlt ?? ''} onChange={(event) => setField('media', { ...draft.media, imageAlt: event.target.value || undefined })} placeholder="Describe the primary event image" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Hero image URL<input value={draft.media.heroImage ?? ''} onChange={(event) => setField('media', { ...draft.media, heroImage: event.target.value || undefined })} placeholder="/images/events/..." className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Hero image alt text<input maxLength={500} value={draft.media.heroImageAlt ?? ''} onChange={(event) => setField('media', { ...draft.media, heroImageAlt: event.target.value || undefined })} placeholder="Describe the hero event image" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Approved hero video URL<input value={draft.media.heroVideo ?? ''} onChange={(event) => setField('media', { ...draft.media, heroVideo: event.target.value || undefined })} placeholder="https://www.youtube.com/..." className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Registration link<input value={draft.resources.registrationLink ?? ''} onChange={(event) => setField('resources', { ...draft.resources, registrationLink: event.target.value || undefined })} placeholder="https://..." className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm md:col-span-2">Registration note<textarea maxLength={500} value={draft.resources.registrationNote ?? ''} onChange={(event) => setField('resources', { ...draft.resources, registrationNote: event.target.value || undefined })} rows={2} placeholder="Optional note shown with registration details" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">PDF resource URL<input value={draft.resources.pdfUrl ?? ''} onChange={(event) => setField('resources', { ...draft.resources, pdfUrl: event.target.value || undefined })} placeholder="/documents/events/..." className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <fieldset className="space-y-3 rounded-lg border border-white/10 p-4 md:col-span-2">
          <legend className="px-1 text-sm font-semibold">Gallery images ({galleryRows.length}/40)</legend>
          <p className="text-xs text-blue-200">Each row pairs an approved image URL with matching Gallery image alt text. Leave a field blank when the title fallback is sufficient.</p>
          {galleryRows.length === 0 ? <p className="rounded border border-dashed border-white/15 p-3 text-sm text-blue-200" role="status">No gallery images added yet.</p> : galleryRows.map((row, index) => (
            <div key={`gallery-${index}`} className="grid gap-3 rounded border border-white/10 p-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="space-y-1 text-sm">Gallery image {index + 1} URL<input value={row.url} onChange={(event) => updateGalleryRows(galleryRows.map((current, rowIndex) => rowIndex === index ? { ...current, url: event.target.value } : current))} placeholder="/images/events/..." className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
              <label className="space-y-1 text-sm">Gallery image {index + 1} alt text<input maxLength={500} value={row.alt ?? draft.media.galleryAlts?.[index] ?? ''} onChange={(event) => updateGalleryRows(galleryRows.map((current, rowIndex) => rowIndex === index ? { ...current, alt: event.target.value } : current))} placeholder={`Describe gallery image ${index + 1}`} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
              <button type="button" onClick={() => updateGalleryRows(galleryRows.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Remove gallery image ${index + 1}`} className="inline-flex min-h-11 items-center justify-center gap-1 self-end rounded border border-rose-300/30 px-3 py-2 text-sm text-rose-100"><Trash2 className="h-4 w-4" aria-hidden="true" />Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => updateGalleryRows([...galleryRows, { url: '', alt: '' }])} disabled={galleryRows.length >= 40} className="inline-flex min-h-11 items-center gap-2 rounded border border-white/15 px-3 py-2 text-sm disabled:opacity-50"><Plus className="h-4 w-4" aria-hidden="true" />Add gallery image</button>
        </fieldset>
        <fieldset className="space-y-3 rounded-lg border border-white/10 p-4 md:col-span-2">
          <legend className="px-1 text-sm font-semibold">YouTube/video resources ({youtubeRows.length}/20)</legend>
          <p className="text-xs text-blue-200">Add approved YouTube or video resource URLs. The server validates every URL when you save.</p>
          {youtubeRows.length === 0 ? <p className="rounded border border-dashed border-white/15 p-3 text-sm text-blue-200" role="status">No YouTube/video resources added yet.</p> : youtubeRows.map((row, index) => (
            <div key={`youtube-${index}`} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="space-y-1 text-sm">YouTube/video resource {index + 1} URL<input value={row.url} onChange={(event) => updateYoutubeRows(youtubeRows.map((current, rowIndex) => rowIndex === index ? { url: event.target.value } : current))} placeholder="https://www.youtube.com/watch?v=..." className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
              <button type="button" onClick={() => updateYoutubeRows(youtubeRows.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Remove YouTube/video resource ${index + 1}`} className="inline-flex min-h-11 items-center justify-center gap-1 self-end rounded border border-rose-300/30 px-3 py-2 text-sm text-rose-100"><Trash2 className="h-4 w-4" aria-hidden="true" />Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => updateYoutubeRows([...youtubeRows, { url: '' }])} disabled={youtubeRows.length >= 20} className="inline-flex min-h-11 items-center gap-2 rounded border border-white/15 px-3 py-2 text-sm disabled:opacity-50"><Plus className="h-4 w-4" aria-hidden="true" />Add YouTube/video resource</button>
        </fieldset>
        <fieldset className="space-y-3 rounded-lg border border-white/10 p-4 md:col-span-2">
          <legend className="px-1 text-sm font-semibold">Outcomes ({outcomeRows.length}/30)</legend>
          <p className="text-xs text-blue-200">Capture approved outcome labels and values for the event record.</p>
          {outcomeRows.length === 0 ? <p className="rounded border border-dashed border-white/15 p-3 text-sm text-blue-200" role="status">No outcomes added yet.</p> : outcomeRows.map((row, index) => (
            <div key={`outcome-${index}`} className="grid gap-3 rounded border border-white/10 p-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="space-y-1 text-sm">Outcome {index + 1} key<input maxLength={80} value={row.key} onChange={(event) => updateOutcomeRows(outcomeRows.map((current, rowIndex) => rowIndex === index ? { ...current, key: event.target.value } : current))} placeholder="students_reached" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
              <label className="space-y-1 text-sm">Outcome {index + 1} value<input maxLength={500} value={row.value} onChange={(event) => updateOutcomeRows(outcomeRows.map((current, rowIndex) => rowIndex === index ? { ...current, value: event.target.value } : current))} placeholder="Describe the outcome" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
              <button type="button" onClick={() => updateOutcomeRows(outcomeRows.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Remove outcome ${index + 1}`} className="inline-flex min-h-11 items-center justify-center gap-1 self-end rounded border border-rose-300/30 px-3 py-2 text-sm text-rose-100"><Trash2 className="h-4 w-4" aria-hidden="true" />Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => updateOutcomeRows([...outcomeRows, { key: '', value: '' }])} disabled={outcomeRows.length >= 30} className="inline-flex min-h-11 items-center gap-2 rounded border border-white/15 px-3 py-2 text-sm disabled:opacity-50"><Plus className="h-4 w-4" aria-hidden="true" />Add outcome</button>
        </fieldset>
        <div className="md:col-span-2 rounded-lg border border-cyan-300/20 bg-cyan-400/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm">Approved media type<select value={uploadKind} onChange={(event) => setUploadKind(event.target.value as typeof uploadKind)} className="ml-2 min-h-11 rounded border border-white/10 bg-slate-800 p-2"><option value="image">Image</option><option value="video">Video</option><option value="document">Private PDF</option></select></label>
            {uploadKind === 'image' && <label className="text-sm">Assign finalized image<select value={imageAssignment} onChange={(event) => setImageAssignment(event.target.value as typeof imageAssignment)} className="ml-2 min-h-11 rounded border border-white/10 bg-slate-800 p-2"><option value="primary">Primary/hero media</option><option value="gallery">Append to gallery</option></select></label>}
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm font-semibold hover:bg-cyan-300/10">
              <Upload className="h-4 w-4" />
              {uploading ? 'Processing…' : 'Choose and upload'}
              <input type="file" className="sr-only" disabled={uploading} accept={uploadKind === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : uploadKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'application/pdf'} onChange={(event) => void uploadMedia(event)} />
            </label>
          </div>
          <p className="mt-2 text-xs text-blue-200">Files are checked again on the server; picker filters are only a convenience.</p>
          {uploadMessage && <p className="mt-2 text-sm text-cyan-100">{uploadMessage}</p>}
        </div>
        <div className="md:col-span-2"><button disabled={saving} className="min-h-11 rounded-lg bg-accent px-5 py-2 font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Save event'}</button></div>
      </form>

      <div className="space-y-3">
        {loading ? <p className="text-blue-200">Loading events…</p> : events.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-blue-200">No events found.</p> : events.map((event) => (
          <article key={event.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{event.title}</h3><p className="text-sm text-blue-200"><Calendar className="mr-1 inline h-4 w-4" /><span>{event.startLabel || 'No date'} · {event.status} · {event.publicationState}</span></p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { const nextDraft = eventToDraft(event); setDraft(nextDraft); setEditingId(event.id); setGalleryRows(galleryRowsFromMedia(nextDraft.media)); setYoutubeRows(resourceRowsFromMedia(nextDraft.media)); setOutcomeRows(outcomeRowsFromEvent(nextDraft.outcomes)) }} className="inline-flex min-h-11 items-center gap-1 rounded border border-white/15 px-3 py-1 text-sm"><Edit2 className="h-4 w-4" aria-hidden="true" />Edit</button><button type="button" onClick={() => void changeState(event.id, event.publicationState === 'published' ? 'unpublish' : 'publish')} className="min-h-11 rounded border border-white/15 px-3 py-1 text-sm">{event.publicationState === 'published' ? 'Unpublish' : 'Publish'}</button><button type="button" onClick={() => void changeState(event.id, 'archive')} className="min-h-11 rounded border border-white/15 px-3 py-1 text-sm">Archive</button><button type="button" onClick={() => void deleteEvent(event.id)} aria-label={`Delete ${event.title}`} className="inline-flex min-h-11 items-center justify-center rounded border border-rose-300/30 px-3 py-1 text-sm text-rose-100"><Trash2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Delete</span></button></div></div>
          </article>
        ))}
      </div>
    </section>
  )
}
