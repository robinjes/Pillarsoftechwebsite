import type { Metadata } from 'next'
import Link from 'next/link'

import GeorgiaLaunchPreview from '@/components/branches/GeorgiaLaunchPreview'
import { requireVerifiedStaff } from '@/lib/auth/server'

export const metadata: Metadata = {
  title: 'Private branch design preview | Pillars of Tech',
  robots: { index: false, follow: false },
}

export default async function GeorgiaDesignPreviewPage() {
  // Pages can render in parallel with layouts. Keep the draft out of the
  // server-component payload too; the parent layout handles access messaging.
  const auth = await requireVerifiedStaff()
  if (!auth.ok) return null

  return (
    <main>
      <aside aria-label="Design review notice" className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-sky/40 bg-midnight p-4 text-sm text-warm">
        <div>
          <p className="font-bold text-sky">Private design draft · not published</p>
          <p className="mt-1 max-w-2xl">Preview copy for review. Local details and launch approval are still pending. This page does not publish the Georgia branch.</p>
        </div>
        <Link href="/admin/branches" className="inline-flex min-h-11 items-center font-bold underline">Back to branch editor</Link>
      </aside>
      <GeorgiaLaunchPreview />
    </main>
  )
}
