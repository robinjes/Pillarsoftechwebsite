'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail, Search } from 'lucide-react'

type ContactSubmission = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  schoolName: string
  studentCount: string
  status: string
  createdAt: string
  updatedAt: string
}

const statusOptions = ['all', 'new', 'in_progress', 'resolved', 'spam'] as const

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value || 'Unknown time'
}

export default function AdminContact() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        const response = await fetch('/api/admin/contact', { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || 'Contact inbox could not be loaded.')
        setSubmissions(Array.isArray(result.submissions) ? result.submissions as ContactSubmission[] : [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Contact inbox could not be loaded.')
      } finally {
        setLoading(false)
      }
    }
    void loadSubmissions()
  }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredSubmissions = useMemo(() => submissions.filter((submission) => {
    if (status !== 'all' && submission.status !== status) return false
    if (!normalizedSearch) return true
    return [submission.name, submission.email, submission.subject, submission.message, submission.schoolName, submission.studentCount].join(' ').toLowerCase().includes(normalizedSearch)
  }), [normalizedSearch, status, submissions])

  return (
    <section className="space-y-6 text-white">
      <div><h1 className="text-3xl font-bold">Contact inbox</h1><p className="mt-1 text-sm text-blue-200">Read stored contact submissions and reply through your approved mail client.</p></div>
      {error && <p role="alert" aria-live="assertive" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-rose-100">{error}</p>}
      {loading ? <p className="text-blue-200">Loading inbox…</p> : <div className="space-y-5 rounded-xl border border-white/10 bg-slate-900/60 p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]"><label className="block space-y-1 text-sm">Search messages<div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-blue-200" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, subject, or message" className="min-h-11 w-full rounded border border-white/10 bg-slate-800 py-2 pl-10 pr-3" /></div></label><label className="block space-y-1 text-sm">Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="min-h-11 w-full rounded border border-white/10 bg-slate-800 p-2 md:min-w-40">{statusOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All statuses' : option.replace('_', ' ')}</option>)}</select></label></div>
        {submissions.length === 0 ? <p className="rounded border border-dashed border-white/15 p-8 text-center text-blue-200">No contact submissions found.</p> : filteredSubmissions.length === 0 ? <p className="rounded border border-dashed border-white/15 p-8 text-center text-blue-200">No messages match these filters.</p> : <div className="space-y-4" aria-live="polite">{filteredSubmissions.map((submission) => <article key={submission.id} className="rounded-lg border border-white/10 bg-slate-800/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3"><div><h2 className="text-lg font-semibold">{submission.subject || 'No subject'}</h2><p className="text-sm text-blue-200">{submission.name} · {submission.email}</p></div><div className="flex flex-wrap items-center gap-3 text-sm text-blue-200"><span className="rounded border border-white/20 px-2 py-1">{submission.status.replace('_', ' ')}</span><time dateTime={submission.createdAt}>{formatDateTime(submission.createdAt)}</time></div></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">{submission.message}</p>{(submission.schoolName || submission.studentCount) && <dl className="mt-4 grid gap-3 border-t border-white/10 pt-3 text-sm sm:grid-cols-2">{submission.schoolName && <div><dt className="text-xs uppercase tracking-wide text-blue-200">School</dt><dd>{submission.schoolName}</dd></div>}{submission.studentCount && <div><dt className="text-xs uppercase tracking-wide text-blue-200">Student count</dt><dd>{submission.studentCount}</dd></div>}</dl>}<div className="mt-4"><a href={`mailto:${encodeURIComponent(submission.email)}?subject=${encodeURIComponent(`Re: ${submission.subject || 'Your message to Pillars of Tech'}`)}`} className="inline-flex min-h-11 items-center gap-2 rounded border border-sky/50 px-3 py-2 text-sm font-semibold text-sky"><Mail className="h-4 w-4" aria-hidden="true" />Reply by email</a></div></article>)}</div>}
      </div>}
    </section>
  )
}
