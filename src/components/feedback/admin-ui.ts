// Shared look and request helper for the feedback host tools, matching the
// live Q&A host page.

export const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 border px-3 text-sm font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
export const primaryButton = `${buttonClass} border-midnight bg-midnight text-warm hover:bg-cobalt`
export const secondaryButton = `${buttonClass} border-midnight/40 bg-warm text-midnight hover:border-midnight`
export const dangerButton = `${buttonClass} border-red-900/50 bg-warm text-red-900 hover:border-red-900`
export const fieldClass = 'w-full border border-midnight/30 bg-white/70 px-3 py-2 text-base text-ink focus:border-midnight focus:outline-hidden focus:ring-2 focus:ring-sky'

export async function sendJson<T = { ok?: boolean; id?: string }>(url: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(result.error || 'That change could not be saved.')
  return result
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fileSlug(title: string): string {
  return title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'feedback'
}
