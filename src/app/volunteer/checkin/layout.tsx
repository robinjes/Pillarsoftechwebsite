import { requireVerifiedStaff } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function StaffCheckinLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireVerifiedStaff()
  if (!auth.ok) {
    if (auth.code === 'unauthenticated') redirect('/volunteer?error=staff-signin')
    if (auth.code === 'not_staff') {
      return (
        <main className="min-h-screen bg-primary px-6 py-24 text-white">
          <div className="mx-auto max-w-xl rounded-3xl border border-amber-400/30 bg-amber-400/10 p-8">
            <h1 className="text-2xl font-bold">Staff access required</h1>
            <p className="mt-3 text-amber-100">This scanner is limited to verified staff membership.</p>
          </div>
        </main>
      )
    }
    return (
      <main className="min-h-screen bg-primary px-6 py-24 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-400/30 bg-amber-400/10 p-8">
          <h1 className="text-2xl font-bold">Staff verification unavailable</h1>
          <p className="mt-3 text-amber-100">No scanner data or mutation was allowed.</p>
        </div>
      </main>
    )
  }
  return children
}
