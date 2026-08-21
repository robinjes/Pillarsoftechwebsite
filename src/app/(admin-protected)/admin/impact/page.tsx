'use client'

import { useEffect, useState } from 'react'
import { Edit2, Plus, Trash2 } from 'lucide-react'

import type { ImpactMetric } from '@/lib/content-contracts'

const blankMetric: ImpactMetric = {
  key: '',
  value: 0,
  unit: '',
  publicLabel: '',
  asOf: null,
  sourceUrl: '',
  methodologyNote: '',
  approvalStatus: 'pending',
  displayOrder: 0,
}

const cloneMetric = (metric: ImpactMetric): ImpactMetric => ({ ...metric })

export default function AdminImpact() {
  const [metrics, setMetrics] = useState<ImpactMetric[]>([])
  const [draft, setDraft] = useState<ImpactMetric>(blankMetric)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/impact', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Impact metrics could not be loaded.')
      setMetrics(Array.isArray(result.metrics) ? result.metrics as ImpactMetric[] : [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impact metrics could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadMetrics() }, [])

  const startNewMetric = () => {
    setDraft(cloneMetric(blankMetric))
    setEditingKey(null)
    setMessage('')
    setError('')
  }

  const approvalRequirementsMissing = draft.approvalStatus === 'approved' && (!draft.asOf || !draft.sourceUrl.trim() || !draft.methodologyNote.trim())

  const saveMetric = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    if (approvalRequirementsMissing) {
      setError('Approved metrics require an evidence date, evidence URL, and methodology.')
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/admin/impact', {
        method: editingKey ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Impact metric could not be saved.')
      const savedMetric = result.metric as ImpactMetric | undefined
      if (savedMetric) {
        setDraft(cloneMetric(savedMetric))
        setEditingKey(savedMetric.key)
      }
      setMessage('Impact metric saved.')
      await loadMetrics()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impact metric could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const deleteMetric = async (key: string) => {
    if (!window.confirm(`Delete the ${key} impact metric?`)) return
    setError('')
    try {
      const response = await fetch(`/api/admin/impact?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Impact metric could not be deleted.')
      if (editingKey === key) startNewMetric()
      setMessage('Impact metric deleted.')
      await loadMetrics()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Impact metric could not be deleted.')
    }
  }

  return (
    <section className="space-y-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">Impact metrics</h1><p className="mt-1 text-sm text-blue-200">Manage approved public impact evidence and its display order.</p></div><button type="button" onClick={startNewMetric} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-slate-900"><Plus className="h-4 w-4" aria-hidden="true" />New metric</button></div>
      {message && <p role="status" aria-live="polite" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">{message}</p>}
      {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-rose-100">{error}</p>}

      <form onSubmit={saveMetric} className="grid gap-4 rounded-xl border border-white/10 bg-slate-900/60 p-5 md:grid-cols-2">
        <h2 className="text-xl font-semibold md:col-span-2">{editingKey ? 'Edit metric' : 'Create metric'}</h2>
        <label className="space-y-1 text-sm">Metric key<input required pattern="[a-z0-9][a-z0-9_-]{0,63}" value={draft.key} disabled={Boolean(editingKey)} onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2 disabled:opacity-60" /></label>
        <label className="space-y-1 text-sm">Public label<input required maxLength={240} value={draft.publicLabel} onChange={(event) => setDraft((current) => ({ ...current, publicLabel: event.target.value }))} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Numeric value<input required type="number" step="any" value={Number.isFinite(draft.value) ? draft.value : ''} onChange={(event) => setDraft((current) => ({ ...current, value: Number(event.target.value) }))} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Unit<input maxLength={80} value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} placeholder="students" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Evidence date<input type="date" value={draft.asOf ?? ''} onChange={(event) => setDraft((current) => ({ ...current, asOf: event.target.value || null }))} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Evidence URL<input maxLength={2048} value={draft.sourceUrl} onChange={(event) => setDraft((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://... or /evidence/..." className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm md:col-span-2">Methodology<textarea maxLength={2000} value={draft.methodologyNote} onChange={(event) => setDraft((current) => ({ ...current, methodologyNote: event.target.value }))} rows={4} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="space-y-1 text-sm">Approval state<select value={draft.approvalStatus} onChange={(event) => setDraft((current) => ({ ...current, approvalStatus: event.target.value as ImpactMetric['approvalStatus'] }))} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
        <label className="space-y-1 text-sm">Display order<input required type="number" min="0" max="10000" step="1" value={draft.displayOrder} onChange={(event) => setDraft((current) => ({ ...current, displayOrder: Number(event.target.value) }))} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <p className="text-xs text-blue-200 md:col-span-2">Approval requires an evidence date, source URL, and methodology. The server remains authoritative and will reject incomplete or unsafe evidence.</p>
        {approvalRequirementsMissing && <p role="alert" className="text-sm text-amber-100 md:col-span-2">Add the evidence date, evidence URL, and methodology before approving this metric.</p>}
        <div className="flex flex-wrap gap-3 md:col-span-2"><button disabled={saving} className="min-h-11 rounded-lg bg-accent px-5 py-2 font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Save metric'}</button>{editingKey && <button type="button" onClick={startNewMetric} className="min-h-11 rounded-lg border border-white/20 px-5 py-2">Cancel edit</button>}</div>
      </form>

      <section aria-labelledby="impact-metric-list-heading" className="space-y-3"><h2 id="impact-metric-list-heading" className="text-xl font-semibold">Stored metrics</h2>{loading ? <p className="text-blue-200">Loading metrics…</p> : metrics.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-blue-200">No impact metrics found.</p> : metrics.map((metric) => <article key={metric.key} className="rounded-xl border border-white/10 bg-slate-900/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{metric.publicLabel}</h3><p className="text-sm text-blue-200"><span className="font-mono">{metric.key}</span> · {metric.value} {metric.unit} · {metric.approvalStatus}</p>{metric.asOf && <p className="text-xs text-blue-200">Evidence date: {metric.asOf}</p>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setDraft(cloneMetric(metric)); setEditingKey(metric.key); setMessage(''); setError('') }} className="inline-flex min-h-11 items-center gap-2 rounded border border-white/15 px-3 py-2 text-sm"><Edit2 className="h-4 w-4" aria-hidden="true" />Edit</button><button type="button" onClick={() => void deleteMetric(metric.key)} className="inline-flex min-h-11 items-center gap-2 rounded border border-rose-300/30 px-3 py-2 text-sm text-rose-100"><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button></div></div></article>)}</section>
    </section>
  )
}
