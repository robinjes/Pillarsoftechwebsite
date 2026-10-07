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

    const isConfigurationUnavailable = auth.code === 'configuration_unavailable'

    return (
      <main className="min-h-screen bg-cream px-5 py-20 text-ink sm:px-8 sm:py-28">
        <div className="site-shell mx-auto max-w-xl border border-midnight/25 bg-warm p-7 shadow-[8px_8px_0_#0B1F3A] sm:p-10">
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-cobalt">Staff workspace</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-midnight sm:text-4xl">
            {isConfigurationUnavailable ? 'Staff sign-in is not set up yet' : 'Staff access could not be checked'}
          </h1>
          <p className="mt-4 text-base leading-7 text-ink/75">
            {isConfigurationUnavailable
              ? 'A site owner needs to finish the sign-in setup before staff tools are available.'
              : 'Your Google sign-in may have succeeded, but we could not confirm staff access. A site owner needs to finish or repair the workspace access setup. Please try again later.'}
          </p>
          <p className="mt-4 text-sm leading-6 text-ink/65">Staff tools stay closed until access can be confirmed.</p>
        </div>
      </main>
    )
  }

  return <AdminShell>{children}</AdminShell>
}
