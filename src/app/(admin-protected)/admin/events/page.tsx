'use client'

import { useEffect, useState } from 'react'
import { Calendar, Edit2, Plus, Trash2, Upload, X } from 'lucide-react'

import type { EventRecord, EventWrite } from '@/lib/content-contracts'
import { eventWriteSchema } from '@/lib/content-contracts'
import { eventLocalDateTime, eventScheduleInstant, eventScheduleLabels } from '@/lib/event-schedule'
import { supabase } from '@/lib/supabase/client'

const blankEvent: EventWrite = {
  branch: 'ca',
  title: '',
  summary: '',
  description: '',
  startsAt: null,
  endsAt: null,
  timezone: 'America/Los_Angeles',
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
    branch: event.branch,
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
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const [automaticLabels, setAutomaticLabels] = useState(true)
  const [busyEventId, setBusyEventId] = useState<string | null>(null)
  const [outcomeRows, setOutcomeRows] = useState<[string, string][]>([])

  const openEditor = (event?: EventRecord) => {
    const next = event ? eventToDraft(event) : blankEvent
    setDraft(next)
    setEditingId(event?.id ?? null)
    setStartInput(eventLocalDateTime(next.startsAt, next.timezone))
    setEndInput(eventLocalDateTime(next.endsAt, next.timezone))
    setAutomaticLabels(Boolean(next.startsAt) || !event)
    setOutcomeRows(Object.entries(next.outcomes))
    setMessage('')
    setError('')
    setUploadMessage('')
    document.getElementById('event-editor')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

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
      const startsAt = eventScheduleInstant(startInput, draft.timezone, draft.startsAt)
      const endsAt = eventScheduleInstant(endInput, draft.timezone, draft.endsAt)
      const keys = outcomeRows.map(([key]) => key.trim())
      if (new Set(keys).size !== keys.length) throw new Error('Outcome names must be unique.')
      const parsed = eventWriteSchema.safeParse({
        ...draft,
        startsAt,
        endsAt,
        ...(automaticLabels && startsAt ? eventScheduleLabels(startsAt, endsAt, draft.timezone) : {}),
        outcomes: Object.fromEntries(outcomeRows),
      })
      if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' '))
      const response = await fetch(editingId ? `/api/admin/events?id=${encodeURIComponent(editingId)}` : '/api/admin/events', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.issues?.map((issue: { path: string[]; message: string }) => `${issue.path.join('.')}: ${issue.message}`).join(' ') || result.error || 'Event could not be saved.')
      openEditor()
      setMessage('Event saved.')
      await loadEvents()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Event could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const changeState = async (id: string, action: 'publish' | 'unpublish' | 'archive') => {
    setBusyEventId(id)
    setError('')
    try {
      const response = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Event state could not be changed.')
      if (editingId === id) openEditor(result.event)
      setMessage(`Event ${action === 'publish' ? 'published' : action === 'unpublish' ? 'unpublished' : 'archived'}.`)
      await loadEvents()
    } catch (stateError) {
      setError(stateError instanceof Error ? stateError.message : 'Event state could not be changed.')
    } finally {
      setBusyEventId(null)
    }
  }

  const deleteEvent = async (id: string, title: string) => {
    if (!window.confirm(`Delete “${title}” from the portal and event listings? Existing attendance and volunteer hours will be retained.`)) return
    setBusyEventId(id)
    setError('')
    try {
      const response = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Event could not be deleted.')
      if (editingId === id) openEditor()
      setMessage('Event deleted.')
      await loadEvents()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Event could not be deleted.')
    } finally {
      setBusyEventId(null)
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

      const finalUrl = uploadKind === 'document' ? `/api/admin/media/${finalizeResult.media.id}` : finalizeResult.url
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
    <section className="space-y-6 text-[var(--ink)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="mt-1 text-sm text-[var(--cobalt)]">Add, edit, publish, archive, or delete events. Manage schedules, registration, capacity, and event content.</p>
        </div>
        <button type="button" disabled={saving || uploading || busyEventId !== null} onClick={() => openEditor()} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-slate-900 disabled:opacity-50">
          <Plus className="h-4 w-4" /> New event
        </button>
      </div>

      {message && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-900">{error}</p>}

      <form id="event-editor" onSubmit={saveEvent} className="scroll-mt-24 rounded-xl border border-white/10 bg-slate-900 p-5 text-white">
        <fieldset disabled={saving || uploading || busyEventId !== null} className="grid gap-4 md:grid-cols-2 disabled:opacity-60">
        <div className="md:col-span-2 flex items-center justify-between"><h2 className="text-xl font-semibold">{editingId ? 'Edit event' : 'Create event'}</h2>{editingId && <button type="button" aria-label="Cancel editing" onClick={() => openEditor()}><X className="h-5 w-5" /></button>}</div>
        <label className="space-y-1 text-sm">Event ID<input disabled={Boolean(editingId)} pattern="[a-z0-9][a-z0-9_-]{0,63}" value={draft.id ?? ''} onChange={(event) => setField('id', event.target.value || undefined)} placeholder="Generated from title if blank" className="w-full rounded-sm border border-white/10 bg-slate-800 p-2 disabled:opacity-60" /></label>
        <label className="space-y-1 text-sm">URL slug<input pattern="[a-z0-9][a-z0-9_-]{0,63}" value={draft.slug ?? ''} onChange={(event) => setField('slug', event.target.value || undefined)} placeholder="Generated from event ID if blank" className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <p className="text-xs text-blue-200 md:col-span-2">The event ID stays fixed after creation so registrations remain linked. The URL slug can be changed.</p>
        <label className="space-y-1 text-sm">Branch<select value={draft.branch} onChange={(event) => setField('branch', event.target.value as EventWrite['branch'])} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2"><option value="ca">California</option><option value="ga">Georgia</option></select></label>
        <label className="space-y-1 text-sm">Title<input required value={draft.title} onChange={(event) => setField('title', event.target.value)} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Program category<input required value={draft.programCategory} onChange={(event) => setField('programCategory', event.target.value)} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Start date and time<input type="datetime-local" step="1" value={startInput} onChange={(event) => setStartInput(event.target.value)} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">End date and time<input type="datetime-local" step="1" value={endInput} onChange={(event) => setEndInput(event.target.value)} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Event timezone<input required list="event-timezones" value={draft.timezone} onChange={(event) => setField('timezone', event.target.value)} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /><datalist id="event-timezones"><option value="America/Los_Angeles" /><option value="America/New_York" /><option value="America/Chicago" /><option value="America/Denver" /><option value="UTC" /></datalist></label>
        <p className="self-center text-xs text-blue-200">Dates and times use the event timezone. During the fall daylight-saving transition, repeated times use the earlier occurrence.</p>
        <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={automaticLabels} onChange={(event) => setAutomaticLabels(event.target.checked)} /> Generate display date and time from the schedule</label>
        <label className="space-y-1 text-sm">Date label<input disabled={automaticLabels && Boolean(startInput)} value={automaticLabels && startInput ? 'Generated when saved' : draft.startLabel} onChange={(event) => setField('startLabel', event.target.value)} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2 disabled:opacity-60" /></label>
        <label className="space-y-1 text-sm">Time label<input disabled={automaticLabels && Boolean(startInput)} value={automaticLabels && startInput ? 'Generated when saved' : draft.endLabel} onChange={(event) => setField('endLabel', event.target.value)} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2 disabled:opacity-60" /></label>
        <label className="space-y-1 text-sm">Location<input value={draft.location} onChange={(event) => setField('location', event.target.value)} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Status<select value={draft.status} onChange={(event) => setField('status', event.target.value as EventWrite['status'])} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2"><option value="draft">Draft</option><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <label className="space-y-1 text-sm">Publication<select value={draft.publicationState} onChange={(event) => setField('publicationState', event.target.value as EventWrite['publicationState'])} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2"><option value="unpublished">Unpublished</option><option value="published">Published</option></select></label>
        <label className="space-y-1 text-sm">Participant registration<select value={draft.participantRegistrationState} onChange={(event) => setField('participantRegistrationState', event.target.value as EventWrite['participantRegistrationState'])} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2"><option value="closed">Closed</option><option value="open">Open</option><option value="full">Full</option></select></label>
        <label className="space-y-1 text-sm">Volunteer registration<select value={draft.volunteerRegistrationState} onChange={(event) => setField('volunteerRegistrationState', event.target.value as EventWrite['volunteerRegistrationState'])} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2"><option value="closed">Closed</option><option value="open">Open</option><option value="full">Full</option></select></label>
        {(['participantCapacity', 'volunteerCapacity'] as const).map((key) => <label key={key} className="space-y-1 text-sm">{key === 'participantCapacity' ? 'Participant capacity' : 'Volunteer capacity'}<input type="number" min="1" step="1" value={draft[key] ?? ''} onChange={(event) => setField(key, event.target.value === '' ? null : Number(event.target.value))} placeholder="No limit" className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>)}
        <label className="space-y-1 text-sm md:col-span-2">Summary<textarea value={draft.summary} onChange={(event) => setField('summary', event.target.value)} rows={2} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm md:col-span-2">Description<textarea value={draft.description} onChange={(event) => setField('description', event.target.value)} rows={6} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Local/approved image URL<input value={draft.media.image ?? ''} onChange={(event) => setField('media', { ...draft.media, image: event.target.value || undefined })} placeholder="/images/events/..." className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Hero image URL<input value={draft.media.heroImage ?? ''} onChange={(event) => setField('media', { ...draft.media, heroImage: event.target.value || undefined })} placeholder="/images/events/..." className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Primary image alt text<input maxLength={500} value={draft.media.imageAlt ?? ''} onChange={(event) => setField('media', { ...draft.media, imageAlt: event.target.value || undefined })} placeholder="Describe the primary event image" className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Hero image alt text<input maxLength={500} value={draft.media.heroImageAlt ?? ''} onChange={(event) => setField('media', { ...draft.media, heroImageAlt: event.target.value || undefined })} placeholder="Describe the hero event image" className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Approved video URL<input value={draft.media.heroVideo ?? ''} onChange={(event) => setField('media', { ...draft.media, heroVideo: event.target.value || undefined })} placeholder="https://www.youtube.com/..." className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
          <fieldset className="space-y-3 rounded-lg border border-white/10 p-4 md:col-span-2">
            <legend className="px-1 text-sm font-semibold">Gallery images</legend>
            <p className="text-xs text-blue-200">Gallery image alt text is optional. Leave a field blank when the title fallback is sufficient.</p>
            {(draft.media.gallery ?? []).map((image, index) => (
              <div key={index} className="space-y-2">
              <label className="block space-y-1 text-sm">Gallery image {index + 1} URL<input required value={image} onChange={(event) => { const gallery = [...(draft.media.gallery ?? [])]; gallery[index] = event.target.value; setField('media', { ...draft.media, gallery }) }} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>
              <label className="block space-y-1 text-sm">
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
                  className="w-full rounded-sm border border-white/10 bg-slate-800 p-2"
                />
              </label>
              <button type="button" onClick={() => setField('media', { ...draft.media, gallery: draft.media.gallery?.filter((_, position) => position !== index), galleryAlts: draft.media.galleryAlts?.filter((_, position) => position !== index) })} className="rounded border border-rose-300/30 px-3 py-2 text-sm text-rose-100">Remove gallery image {index + 1}</button>
              </div>
            ))}
            <button type="button" disabled={(draft.media.gallery?.length ?? 0) >= 40} onClick={() => setField('media', { ...draft.media, gallery: [...(draft.media.gallery ?? []), ''], galleryAlts: [...(draft.media.gallery ?? []).map((_, index) => draft.media.galleryAlts?.[index] ?? ''), ''] })} className="rounded border border-white/20 px-3 py-2 text-sm">Add gallery image</button>
          </fieldset>
        <fieldset className="space-y-3 rounded-lg border border-white/10 p-4 md:col-span-2">
          <legend className="px-1 text-sm font-semibold">YouTube videos</legend>
          {(draft.media.youtubeVideos ?? []).map((url, index) => <div key={index} className="flex items-end gap-2"><label className="flex-1 space-y-1 text-sm">YouTube video {index + 1}<input required value={url} onChange={(event) => { const youtubeVideos = [...(draft.media.youtubeVideos ?? [])]; youtubeVideos[index] = event.target.value; setField('media', { ...draft.media, youtubeVideos }) }} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label><button type="button" aria-label={`Remove YouTube video ${index + 1}`} onClick={() => setField('media', { ...draft.media, youtubeVideos: draft.media.youtubeVideos?.filter((_, position) => position !== index) })} className="rounded border border-rose-300/30 px-3 py-2 text-sm">Remove</button></div>)}
          <button type="button" disabled={(draft.media.youtubeVideos?.length ?? 0) >= 20} onClick={() => setField('media', { ...draft.media, youtubeVideos: [...(draft.media.youtubeVideos ?? []), ''] })} className="rounded border border-white/20 px-3 py-2 text-sm">Add YouTube video</button>
        </fieldset>
        {(['pdfUrl', 'registrationLink', 'registrationNote'] as const).map((key) => <label key={key} className="space-y-1 text-sm">{key === 'pdfUrl' ? 'PDF URL' : key === 'registrationLink' ? 'Registration link' : 'Registration note'}<input value={draft.resources[key] ?? ''} onChange={(event) => setField('resources', { ...draft.resources, [key]: event.target.value || undefined })} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label>)}
        <fieldset className="space-y-3 rounded-lg border border-white/10 p-4 md:col-span-2">
          <legend className="px-1 text-sm font-semibold">Event outcomes</legend>
          {outcomeRows.map(([key, value], index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><label className="space-y-1 text-sm">Outcome {index + 1} name<input required maxLength={80} value={key} onChange={(event) => setOutcomeRows((rows) => rows.map((row, position) => position === index ? [event.target.value, row[1]] : row))} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label><label className="space-y-1 text-sm">Outcome {index + 1} value<input maxLength={500} value={value} onChange={(event) => setOutcomeRows((rows) => rows.map((row, position) => position === index ? [row[0], event.target.value] : row))} className="w-full rounded-sm border border-white/10 bg-slate-800 p-2" /></label><button type="button" aria-label={`Remove outcome ${index + 1}`} onClick={() => setOutcomeRows((rows) => rows.filter((_, position) => position !== index))} className="self-end rounded border border-rose-300/30 px-3 py-2 text-sm">Remove</button></div>)}
          <button type="button" disabled={outcomeRows.length >= 30} onClick={() => setOutcomeRows((rows) => [...rows, ['', '']])} className="rounded border border-white/20 px-3 py-2 text-sm">Add outcome</button>
        </fieldset>
        <div className="md:col-span-2 rounded-lg border border-cyan-300/20 bg-cyan-400/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm">Approved media type<select value={uploadKind} onChange={(event) => setUploadKind(event.target.value as typeof uploadKind)} className="ml-2 rounded-sm border border-white/10 bg-slate-800 p-2"><option value="image">Image</option><option value="video">Video</option><option value="document">Private PDF</option></select></label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm font-semibold hover:bg-cyan-300/10">
              <Upload className="h-4 w-4" />
              {uploading ? 'Processing…' : 'Choose and upload'}
              <input type="file" className="sr-only" disabled={uploading} accept={uploadKind === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : uploadKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'application/pdf'} onChange={(event) => void uploadMedia(event)} />
            </label>
          </div>
          <p className="mt-2 text-xs text-blue-200">Files are checked again on the server; picker filters are only a convenience.</p>
          {uploadMessage && <p className="mt-2 text-sm text-cyan-100">{uploadMessage}</p>}
        </div>
        <div className="md:col-span-2"><button disabled={saving || uploading} className="rounded-lg bg-accent px-5 py-2 font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Save event'}</button></div>
        </fieldset>
      </form>

      <div className="space-y-3">
        {loading ? <p className="text-[var(--ink)]/65">Loading events…</p> : events.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--ink)]/25 p-8 text-center text-[var(--ink)]/65">No events found.</p> : events.map((event) => (
          <article key={event.id} className="rounded-xl border border-white/10 bg-slate-900 p-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{event.title}</h3><p className="text-sm text-blue-200"><Calendar className="mr-1 inline h-4 w-4" />{event.branch === 'ga' ? 'Georgia' : event.branch === 'ca' ? 'California' : 'Branch not listed'} · {event.startLabel || 'No date'} · {event.endLabel || 'No time'} · {event.status} · {event.publicationState}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={saving || uploading || busyEventId !== null} onClick={() => openEditor(event)} className="inline-flex items-center gap-1 rounded-sm border border-white/15 px-3 py-1 text-sm"><Edit2 className="h-4 w-4" />Edit</button><button type="button" disabled={saving || uploading || busyEventId !== null} onClick={() => void changeState(event.id, event.publicationState === 'published' ? 'unpublish' : 'publish')} className="rounded-sm border border-white/15 px-3 py-1 text-sm">{event.publicationState === 'published' ? 'Unpublish' : 'Publish'}</button><button type="button" disabled={saving || uploading || busyEventId !== null} onClick={() => void changeState(event.id, 'archive')} className="rounded-sm border border-white/15 px-3 py-1 text-sm">Archive</button><button type="button" disabled={saving || uploading || busyEventId !== null} aria-label={`Delete ${event.title}`} onClick={() => void deleteEvent(event.id, event.title)} className="rounded-sm border border-rose-300/30 px-3 py-1 text-sm text-rose-100"><Trash2 className="h-4 w-4" /></button></div></div>
          </article>
        ))}
      </div>
    </section>
  )
}
