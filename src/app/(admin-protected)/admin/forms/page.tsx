'use client'

import { useEffect, useState } from 'react'

import { MAX_FORM_FIELDS, MAX_FORM_OPTIONS, type EventRecord, type FormDefinition, type FormField } from '@/lib/content-contracts'

const exampleFields: FormField[] = [
  { id: 'full_name', type: 'text', label: 'Full name', required: true },
  { id: 'email', type: 'email', label: 'Email address', required: true },
]

const allowedFieldTypes: FormField['type'][] = ['text', 'email', 'textarea', 'select', 'radio', 'checkbox']

const cloneFields = (fields: FormField[]): FormField[] => fields.map((field) => ({
  ...field,
  ...(field.options ? { options: [...field.options] } : {}),
}))

const hasDuplicateOptions = (options: string[]) => {
  const seen = new Set<string>()
  return options.some((option) => {
    const normalized = option.trim()
    if (!normalized) return false
    if (seen.has(normalized)) return true
    seen.add(normalized)
    return false
  })
}

const fieldForType = (field: FormField, type: FormField['type']): FormField => {
  const nextField = { ...field, type }
  if (type !== 'select' && type !== 'radio') delete nextField.options
  return nextField
}

const nextFieldId = (fields: FormField[]) => {
  let suffix = fields.length + 1
  while (fields.some((field) => field.id === `field_${suffix}`)) suffix += 1
  return `field_${suffix}`
}

export default function AdminForms() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [eventId, setEventId] = useState('')
  const [formId, setFormId] = useState('')
  const [fields, setFields] = useState<FormField[]>(() => cloneFields(exampleFields))
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
      setFields(cloneFields(form?.fields ?? exampleFields))
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

  const startNewForm = () => {
    setFormId(crypto.randomUUID())
    setFields(cloneFields(exampleFields))
    setIsActive(false)
    setMessage('')
    setError('')
  }

  const updateField = (index: number, nextField: FormField) => {
    setFields((current) => current.map((field, fieldIndex) => fieldIndex === index ? nextField : field))
  }

  const addField = () => {
    if (fields.length >= MAX_FORM_FIELDS) return
    setFields((current) => [...current, {
      id: nextFieldId(current),
      type: 'text',
      label: 'New field',
      required: false,
    }])
  }

  const removeField = (index: number) => {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))
  }

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(nextIndex, 0, moved)
      return next
    })
  }

  const saveForm = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const body = { id: formId || crypto.randomUUID(), eventId, kind: 'participant', fields, isActive }
      const response = await fetch('/api/admin/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Form could not be saved.')
      setFormId(result.form?.id || formId)
      setMessage('Form saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Invalid form body.')
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
      <div className="flex items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Registration forms</h1><p className="mt-1 text-sm text-blue-200">Validated participant fields only. Destinations and webhooks are not supported.</p></div><button type="button" onClick={startNewForm} className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-accent px-4 py-2 font-semibold text-slate-900">Start new form</button></div>
      {message && <p role="status" aria-live="polite" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">{message}</p>}
      {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-rose-100">{error}</p>}
      {loading ? <p className="text-blue-200">Loading…</p> : events.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-blue-200">Create an event before adding a form.</p> : <form onSubmit={saveForm} className="space-y-5 rounded-xl border border-white/10 bg-slate-900/60 p-5">
        <label className="block space-y-1 text-sm">Event<select value={eventId} onChange={(event) => { setEventId(event.target.value); void loadForm(event.target.value) }} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2">{events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4" /> Published event may accept participant registrations</label>

        <section aria-labelledby="form-fields-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="form-fields-heading" className="text-xl font-semibold">Fields</h2><p className="text-xs text-blue-200">Add up to {MAX_FORM_FIELDS} fields. Field IDs must be unique and use lowercase letters, numbers, underscores, or hyphens.</p></div><span className="text-sm text-blue-200">{fields.length}/{MAX_FORM_FIELDS}</span></div>
          {fields.length === 0 ? <p className="rounded border border-dashed border-white/15 p-4 text-sm text-blue-200" role="status">No fields yet. Add a field or start a new form with full-name and email fields.</p> : <ol className="space-y-4">
            {fields.map((field, index) => (
              <li key={`${field.id}-${index}`} className="space-y-4 rounded-lg border border-white/10 bg-slate-800/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Field {index + 1}</h3><div className="flex flex-wrap gap-2"><button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="min-h-11 rounded border border-white/15 px-3 py-2 text-sm disabled:opacity-40">Move up</button><button type="button" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="min-h-11 rounded border border-white/15 px-3 py-2 text-sm disabled:opacity-40">Move down</button><button type="button" onClick={() => removeField(index)} className="min-h-11 rounded border border-rose-300/30 px-3 py-2 text-sm text-rose-100">Remove field</button></div></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm">Field ID<input required pattern="[a-z][a-z0-9_-]{0,31}" title="Use lowercase letters, numbers, underscores, or hyphens; start with a letter." value={field.id} onChange={(event) => updateField(index, { ...field, id: event.target.value })} className="min-h-11 w-full rounded border border-white/10 bg-slate-900 p-2" /></label>
                  <label className="space-y-1 text-sm">Field type<select value={field.type} onChange={(event) => updateField(index, fieldForType(field, event.target.value as FormField['type']))} className="min-h-11 w-full rounded border border-white/10 bg-slate-900 p-2">{allowedFieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                  <label className="space-y-1 text-sm md:col-span-2">Field label<input required maxLength={160} value={field.label} onChange={(event) => updateField(index, { ...field, label: event.target.value })} className="min-h-11 w-full rounded border border-white/10 bg-slate-900 p-2" /></label>
                </div>
                <div className="flex flex-wrap gap-4"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={field.required} onChange={(event) => updateField(index, { ...field, required: event.target.checked })} className="h-4 w-4" /> Required</label>{field.type === 'checkbox' && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(field.consent)} onChange={(event) => updateField(index, { ...field, consent: event.target.checked })} className="h-4 w-4" /> Consent flag</label>}</div>
                {(field.type === 'select' || field.type === 'radio') && <fieldset className="space-y-3 rounded border border-white/10 p-3"><legend className="px-1 text-sm font-semibold">Options</legend><p className="text-xs text-blue-200">Add each allowed value separately. Values are trimmed and must be unique.</p>{(field.options ?? []).length === 0 ? <p className="rounded border border-dashed border-white/15 p-3 text-sm text-blue-200" role="status">No options yet. Add at least one before saving this field.</p> : (field.options ?? []).map((option, optionIndex) => <div key={`option-${optionIndex}`} className="flex items-end gap-2"><label className="flex-1 space-y-1 text-sm">Option {optionIndex + 1}<input required maxLength={120} value={option} onChange={(event) => updateField(index, { ...field, options: (field.options ?? []).map((current, currentIndex) => currentIndex === optionIndex ? event.target.value : current) })} className="min-h-11 w-full rounded border border-white/10 bg-slate-900 p-2" /></label><button type="button" onClick={() => updateField(index, { ...field, options: (field.options ?? []).filter((_, currentIndex) => currentIndex !== optionIndex) })} aria-label={`Remove option ${optionIndex + 1}`} className="min-h-11 rounded border border-rose-300/30 px-3 py-2 text-sm text-rose-100">Remove option</button></div>)}{(!field.options || field.options.length === 0) && <p role="alert" className="text-xs text-amber-100">Select and radio fields need at least one option before they can be saved.</p>}{(field.options ?? []).some((option) => !option.trim()) && <p role="alert" className="text-xs text-amber-100">Every option needs a value before this field can be saved.</p>}{hasDuplicateOptions(field.options ?? []) && <p role="alert" className="text-xs text-amber-100">Option values must be unique.</p>}{(field.options?.length ?? 0) >= MAX_FORM_OPTIONS && <p className="text-xs text-blue-200">Maximum of {MAX_FORM_OPTIONS} options reached.</p>}<button type="button" onClick={() => updateField(index, { ...field, options: [...(field.options ?? []), ''] })} disabled={(field.options?.length ?? 0) >= MAX_FORM_OPTIONS} className="min-h-11 rounded border border-white/15 px-3 py-2 text-sm disabled:opacity-50">Add option</button></fieldset>}
              </li>
            ))}
          </ol>}
          <button type="button" onClick={addField} disabled={fields.length >= MAX_FORM_FIELDS} className="inline-flex min-h-11 items-center rounded border border-white/15 px-4 py-2 text-sm disabled:opacity-50">Add field</button>
        </section>

        <p className="text-xs text-blue-200">The server validates field IDs, allowed types, option limits, unique IDs, and all other form properties when saving.</p>
        <div className="flex flex-wrap gap-3"><button disabled={saving} className="min-h-11 rounded-lg bg-accent px-5 py-2 font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Save form'}</button><button type="button" onClick={() => void disableForm()} disabled={saving || !eventId} className="min-h-11 rounded-lg border border-rose-300/30 px-5 py-2 text-rose-100 disabled:opacity-50">Disable form</button></div>
      </form>}
    </section>
  )
}
