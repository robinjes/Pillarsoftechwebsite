'use client'

import { useEffect, useState } from 'react'

type ContentDocument = {
  key: string
  title: string
  body: string
  content: Record<string, string>
  publicationState: 'unpublished' | 'published'
  safeForPublic: boolean
}

const blankDocument: ContentDocument = { key: 'homepage', title: '', body: '', content: {}, publicationState: 'unpublished', safeForPublic: false }

export default function AdminSettings() {
  const [document, setDocument] = useState<ContentDocument>(blankDocument)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/content', { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || 'Content could not be loaded.')
        const first = Array.isArray(result.documents) ? result.documents[0] as ContentDocument | undefined : undefined
        if (first) setDocument(first)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Content could not be loaded.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(document) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Content could not be saved.')
      setDocument(result.document)
      setMessage('Content saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Content could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="max-w-3xl space-y-6 text-white">
      <div><h1 className="text-3xl font-bold">Site content</h1><p className="mt-1 text-sm text-blue-200">Manage bounded content documents through the staff API.</p></div>
      {loading ? <p className="text-blue-200">Loading…</p> : <form onSubmit={save} className="space-y-4 rounded-xl border border-white/10 bg-slate-900/60 p-5">
        {message && <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">{message}</p>}
        {error && <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-rose-100">{error}</p>}
        <label className="block space-y-1 text-sm">Key<input required pattern="[a-z0-9][a-z0-9_-]{0,63}" value={document.key} onChange={(event) => setDocument({ ...document, key: event.target.value })} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="block space-y-1 text-sm">Title<input value={document.title} onChange={(event) => setDocument({ ...document, title: event.target.value })} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="block space-y-1 text-sm">Body<textarea value={document.body} onChange={(event) => setDocument({ ...document, body: event.target.value })} rows={8} className="w-full rounded border border-white/10 bg-slate-800 p-2" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={document.safeForPublic} onChange={(event) => setDocument({ ...document, safeForPublic: event.target.checked })} /> Safe for public rendering</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={document.publicationState === 'published'} onChange={(event) => setDocument({ ...document, publicationState: event.target.checked ? 'published' : 'unpublished' })} /> Published</label>
        <button disabled={saving} className="rounded-lg bg-accent px-5 py-2 font-semibold text-slate-900 disabled:opacity-50">{saving ? 'Saving…' : 'Save content'}</button>
      </form>}
    </section>
  )
}
