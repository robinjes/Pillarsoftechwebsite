import { requireVerifiedStaff } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function StaffCheckinLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) {
    if (auth.code === 'unauthenticated') redirect('/volunteer?error=staff-signin')
    if (auth.code === 'not_staff') {
      return (
        <main className="min-h-screen bg-cream px-5 py-20 text-ink sm:px-8 sm:py-28">
          <div className="site-shell mx-auto max-w-xl border border-midnight/25 bg-warm p-7 shadow-[8px_8px_0_#0B1F3A] sm:p-10">
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Attendance desk</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-midnight">Staff access required</h1>
            <p className="mt-4 text-base leading-7 text-ink/75">This scanner is limited to accounts with verified staff membership.</p>
          </div>
        </main>
      )
    }
    return (
      <main className="min-h-screen bg-cream px-5 py-20 text-ink sm:px-8 sm:py-28">
        <div className="site-shell mx-auto max-w-xl border border-midnight/25 bg-warm p-7 shadow-[8px_8px_0_#0B1F3A] sm:p-10">
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Attendance desk</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-midnight">Staff verification unavailable</h1>
          <p className="mt-4 text-base leading-7 text-ink/75">No scanner data or mutation was allowed.</p>
        </div>
      </main>
    )
  }
  return children
}
