'use client'

import { useEffect, useState } from 'react'

import type { EventRecord, FormDefinition, FormField } from '@/lib/content-contracts'

const exampleFields: FormField[] = [
  { id: 'full_name', type: 'text', label: 'Full name', required: true },
  { id: 'email', type: 'email', label: 'Email address', required: true },
]

export default function AdminForms() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [eventId, setEventId] = useState('')
  const [formId, setFormId] = useState('')
  const [fieldsJson, setFieldsJson] = useState(JSON.stringify(exampleFields, null, 2))
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadForm = async (nextEventId: string) => {
    if (!nextEventId) return
    try {
      const response = await fetch(`/api/admin/forms?eventId=${encodeURIComponent(nextEventId)}&kind=participant`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Form could not be loaded.')
      const form = Array.isArray(result.forms) ? result.forms[0] as FormDefinition | undefined : undefined
      setFormId(form?.id || crypto.randomUUID())
      setFieldsJson(JSON.stringify(form?.fields ?? [], null, 2))
      setIsActive(Boolean(form?.isActive))
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Form could not be loaded.')
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
        const first = nextEvents[0]?.id ?? ''
        setEventId(first)
        if (first) await loadForm(first)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Events could not be loaded.')
      } finally {
        setLoading(false)
      }
    }
    void loadEvents()
  }, [])

  const saveForm = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const fields = JSON.parse(fieldsJson) as unknown
      const body = { id: formId || crypto.randomUUID(), eventId, kind: 'participant', fields, isActive }
      const response = await fetch('/api/admin/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Form could not be saved.')
      setFormId(result.form?.id || formId)
      setMessage('Form saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Invalid JSON or form body.')
    } finally {
      setSaving(false)
    }
  }

  const disableForm = async () => {
    if (!eventId) return
    setError('')
    try {
      const response = await fetch(`/api/admin/forms?eventId=${encodeURIComponent(eventId)}&kind=participant`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Form could not be disabled.')
      setIsActive(false)
      setMessage('Form disabled.')
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Form could not be disabled.')
    }
  }

  return (
    <section className="max-w-3xl space-y-6 text-white">
      <div><h1 className="text-3xl font-bold">Registration forms</h1><p className="mt-1 text-sm text-blue-200">Validated participant fields only. Destinations and webhooks are not supported.</p></div>
      {message && <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">{message}</p>}
      {error && <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-rose-100">{error}</p>}
      {loading ? <p className="text-blue-200">Loading…</p> : events.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-blue-200">Create an event before adding a form.</p> : <form onSubmit={saveForm} className="space-y-4 rounded-xl border border-white/10 bg-slate-900/60 p-5">
        <label className="block space-y-1 text-sm">Event<select value={eventId} onChange={(event) => { setEventId(event.target.value); void loadForm(event.target.value) }} className="w-full rounded border border-white/10 bg-slate-800 p-2">{events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Published event may accept participant registrations</label>
        <label className="block space-y-1 text-sm">Fields JSON <span className="text-xs text-blue-200">Use id, type, label, required, optional options/consent; maximum 40 fields.</span><textarea required value={fieldsJson} onChange={(event) => setFieldsJson(event.target.value)} rows={16} spellCheck={false} className="w-full rounded border border-white/10 bg-slate-800 p-3 font-mono text-sm" /></label>
        <div className="flex gap-3"><button disabled={saving} className="rounded-lg bg-accent px-5 py-2 font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Save form'}</button><button type="button" onClick={() => void disableForm()} className="rounded-lg border border-rose-300/30 px-5 py-2 text-rose-100">Disable</button></div>
      </form>}
    </section>
  )
}
