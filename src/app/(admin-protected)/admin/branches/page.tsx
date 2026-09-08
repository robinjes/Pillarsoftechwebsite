'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  branchDocumentSchema,
  emptyBranchDocument,
  type BranchCode,
  type BranchDocument,
} from '@/lib/content-contracts'

type FieldIssue = { path?: PropertyKey[]; message?: string }

const branchNames: Record<BranchCode, string> = { ca: 'California', ga: 'Georgia' }

function documentToJsonState(document: BranchDocument) {
  return {
    leaders: JSON.stringify(document.leaders, null, 2),
    programs: JSON.stringify(document.programs, null, 2),
    photos: JSON.stringify(document.photos, null, 2),
    associatedEventIds: document.associatedEventIds.join(', '),
  }
}

export default function AdminBranches() {
  const [documents, setDocuments] = useState<BranchDocument[]>([])
  const [draft, setDraft] = useState<BranchDocument>(emptyBranchDocument('ca'))
  const [leadersJson, setLeadersJson] = useState('[]')
  const [programsJson, setProgramsJson] = useState('[]')
  const [photosJson, setPhotosJson] = useState('[]')
  const [associatedEventIds, setAssociatedEventIds] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<FieldIssue[]>([])

  const selectDocument = useCallback((document: BranchDocument) => {
    setDraft(document)
    const json = documentToJsonState(document)
    setLeadersJson(json.leaders)
    setProgramsJson(json.programs)
    setPhotosJson(json.photos)
    setAssociatedEventIds(json.associatedEventIds)
    setIssues([])
    setError('')
  }, [])

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/branches', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Branch content could not be loaded.')
      const next = Array.isArray(result.branches) ? result.branches as BranchDocument[] : []
      setDocuments(next)
      if (next[0]) selectDocument(next[0])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Branch content could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [selectDocument])

  useEffect(() => { void loadDocuments() }, [loadDocuments])

  const selectedBranch = useMemo(() => draft.branch, [draft.branch])

  const updateDraft = <K extends keyof BranchDocument>(key: K, value: BranchDocument[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const saveBranch = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    setIssues([])
    try {
      const body: BranchDocument = {
        ...draft,
        leaders: JSON.parse(leadersJson) as BranchDocument['leaders'],
        programs: JSON.parse(programsJson) as BranchDocument['programs'],
        photos: JSON.parse(photosJson) as BranchDocument['photos'],
        associatedEventIds: associatedEventIds.split(',').map((value) => value.trim()).filter(Boolean),
      }
      const local = branchDocumentSchema.safeParse(body)
      if (!local.success) {
        setIssues(local.error.issues)
        throw new Error('Please correct the highlighted branch fields.')
      }
      const response = await fetch('/api/admin/branches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local.data),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setIssues(Array.isArray(result.issues) ? result.issues : [])
        throw new Error(result.error || 'Branch content could not be saved.')
      }
      const saved = result.branch as BranchDocument
      setDocuments((current) => current.map((item) => item.branch === saved.branch ? saved : item))
      selectDocument(saved)
      setMessage(`${branchNames[saved.branch]} draft saved.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Invalid branch fields.')
    } finally {
      setSaving(false)
    }
  }

  const issueText = (issue: FieldIssue) => `${issue.path?.join('.') || 'document'}: ${issue.message || 'Invalid value'}`

  return (
    <section className="max-w-5xl space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-bold">Branches</h1>
        <p className="mt-1 max-w-3xl text-sm text-blue-200">Edit typed branch packets. Georgia stays an empty, unpublished draft until every approved field, photo description, and owner review marker is present.</p>
      </div>

      {message && <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-rose-100">{error}</p>}
      {issues.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-300/40 bg-amber-300/10 p-4 text-amber-100">
          <p className="font-semibold">Packet validation</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{issues.map((issue, index) => <li key={`${issue.path?.join('.')}-${index}`}>{issueText(issue)}</li>)}</ul>
        </div>
      )}

      {loading ? <p className="text-blue-200">Loading branch packets…</p> : (
        <>
          <div className="flex flex-wrap gap-2" aria-label="Select branch packet">
            {(['ca', 'ga'] as BranchCode[]).map((branch) => (
              <button key={branch} type="button" onClick={() => { const document = documents.find((item) => item.branch === branch) || emptyBranchDocument(branch); selectDocument(document) }} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold ${selectedBranch === branch ? 'border-sky bg-sky text-midnight' : 'border-white/30 text-warm hover:bg-white/10'}`} aria-pressed={selectedBranch === branch}>{branchNames[branch]}</button>
            ))}
          </div>

          <form onSubmit={saveBranch} className="grid gap-4 rounded-xl border border-white/10 bg-slate-900/60 p-5 md:grid-cols-2">
            <div className="md:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky">{draft.key}</p><p className="mt-2 text-sm text-blue-200">A saved draft is private. Publishing is accepted only when the server-side typed contract passes its complete packet predicate.</p></div>
            <label className="space-y-1 text-sm">Branch name<input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
            <label className="space-y-1 text-sm">Approved service area<input value={draft.serviceArea} onChange={(event) => updateDraft('serviceArea', event.target.value)} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
            <label className="space-y-1 text-sm md:col-span-2">Leaders JSON <span className="text-xs text-blue-200">Array of {'{ "name", "role" }'} objects; never invent names or roles.</span><textarea value={leadersJson} onChange={(event) => setLeadersJson(event.target.value)} rows={5} spellCheck={false} className="w-full rounded border border-white/10 bg-slate-800 p-3 font-mono text-sm" /></label>
            <label className="space-y-1 text-sm md:col-span-2">Programs JSON <span className="text-xs text-blue-200">Array of {'{ "name", "description" }'} objects using confirmed program copy.</span><textarea value={programsJson} onChange={(event) => setProgramsJson(event.target.value)} rows={5} spellCheck={false} className="w-full rounded border border-white/10 bg-slate-800 p-3 font-mono text-sm" /></label>
            <label className="space-y-1 text-sm md:col-span-2">Approved photos JSON <span className="text-xs text-blue-200">Each item needs a safe URL, non-empty alt, and approved: true.</span><textarea value={photosJson} onChange={(event) => setPhotosJson(event.target.value)} rows={6} spellCheck={false} className="w-full rounded border border-white/10 bg-slate-800 p-3 font-mono text-sm" /></label>
            <label className="space-y-1 text-sm md:col-span-2">Associated event IDs<input value={associatedEventIds} onChange={(event) => setAssociatedEventIds(event.target.value)} placeholder="event-id, another-event-id" className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
            <label className="space-y-1 text-sm">Contact route label<input value={draft.contactRoute.label} onChange={(event) => updateDraft('contactRoute', { ...draft.contactRoute, label: event.target.value })} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
            <label className="space-y-1 text-sm">Contact route URL<input value={draft.contactRoute.url} onChange={(event) => updateDraft('contactRoute', { ...draft.contactRoute, url: event.target.value })} placeholder="/contact or approved HTTPS URL" className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
            <label className="space-y-1 text-sm">CTA label<input value={draft.cta.label} onChange={(event) => updateDraft('cta', { ...draft.cta, label: event.target.value })} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
            <label className="space-y-1 text-sm">CTA URL<input value={draft.cta.url} onChange={(event) => updateDraft('cta', { ...draft.cta, url: event.target.value })} placeholder="/contact or approved HTTPS URL" className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
            <label className="space-y-1 text-sm">Publication state<select value={draft.publicationState} onChange={(event) => updateDraft('publicationState', event.target.value as BranchDocument['publicationState'])} className="w-full rounded border border-white/10 bg-slate-800 p-2"><option value="unpublished">Unpublished draft</option><option value="published">Published</option></select></label>
            <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={draft.safeForPublic} onChange={(event) => updateDraft('safeForPublic', event.target.checked)} /> Mark safe for public</label>
            <label className="space-y-1 text-sm">Approval status<select value={draft.approval.status} onChange={(event) => updateDraft('approval', { ...draft.approval, status: event.target.value as BranchDocument['approval']['status'] })} className="w-full rounded border border-white/10 bg-slate-800 p-2"><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
            <label className="space-y-1 text-sm">Approval time<input type="datetime-local" value={draft.approval.approvedAt ? draft.approval.approvedAt.slice(0, 16) : ''} onChange={(event) => updateDraft('approval', { ...draft.approval, approvedAt: event.target.value ? new Date(event.target.value).toISOString() : null })} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
            <label className="space-y-1 text-sm md:col-span-2">Owner review marker (optional)<input value={draft.approval.approvedBy ?? ''} onChange={(event) => updateDraft('approval', { ...draft.approval, approvedBy: event.target.value || null })} placeholder="Record an owner-approved reference, not a secret" className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
            <div className="md:col-span-2"><button disabled={saving} className="min-h-11 rounded-lg bg-accent px-5 py-2 font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Save branch packet'}</button></div>
          </form>
        </>
      )}
    </section>
  )
}
