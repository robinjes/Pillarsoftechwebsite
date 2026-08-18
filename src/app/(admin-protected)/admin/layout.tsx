import { requireVerifiedStaff } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import AdminShell from './AdminShell'

export const dynamic = 'force-dynamic'

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await requireVerifiedStaff()

  if (!auth.ok) {
    if (auth.code === 'unauthenticated') {
      redirect('/admin/login?error=unauthenticated')
    }

    if (auth.code === 'not_staff') {
      redirect('/admin/login?error=not-staff')
    }

    return (
      <main className="min-h-screen bg-slate-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-400/30 bg-amber-400/10 p-8">
          <h1 className="text-2xl font-bold">Staff access is temporarily unavailable</h1>
          <p className="mt-3 text-amber-100">
            Supabase authentication is not configured or could not verify staff membership. No
            administrative data or mutation was allowed.
          </p>
        </div>
      </main>
    )
  }

  return <AdminShell>{children}</AdminShell>
}
