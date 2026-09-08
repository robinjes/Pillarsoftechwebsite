'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'

import { isSupabaseConfigured } from '@/lib/supabase/client'
import { volunteerService } from '@/lib/volunteerService'

type LoginMessage = 'configuration' | 'unauthenticated' | 'not-staff' | 'callback' | null

function messageFor(reason: LoginMessage): string {
  switch (reason) {
    case 'configuration':
      return 'Google sign-in is not configured on this deployment. An administrator must configure Supabase before staff access is available.'
    case 'not-staff':
      return 'You are signed in, but your account is not listed in the staff membership table. Ask an owner to grant staff access.'
    case 'callback':
      return 'Google sign-in could not be completed. Please try again.'
    case 'unauthenticated':
      return 'A verified Google sign-in is required to continue.'
    default:
      return ''
  }
}

export default function AdminLogin() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const configured = isSupabaseConfigured()

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('error')
    if (reason === 'configuration' || reason === 'unauthenticated' || reason === 'not-staff' || reason === 'callback') {
      setError(messageFor(reason))
    }
  }, [])

  const handleGoogleSignIn = async () => {
    if (!configured) {
      setError(messageFor('configuration'))
      return
    }

    setLoading(true)
    setError('')
    try {
      await volunteerService.signInWithGoogle('/admin')
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : messageFor('callback'))
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-cream px-5 py-16 text-ink sm:px-8 sm:py-24">
      <div className="site-shell mx-auto flex min-h-[calc(100vh-12rem)] items-center justify-center">
        <div className="w-full max-w-xl">
          <div className="border border-midnight/25 bg-midnight p-6 text-warm shadow-[8px_8px_0_#101114] sm:p-10">
            <div className="flex items-start gap-4 border-b border-white/20 pb-7">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center border border-sky bg-sky text-midnight" aria-hidden="true">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-sky">Pillars of Tech · Admin</p>
                <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-warm sm:text-5xl">Staff access</h1>
              </div>
            </div>

            <p className="mt-7 max-w-lg text-base leading-7 text-warm/80">
              Sign in with the Google account granted staff access by a database owner. Staff membership is verified on the server before any administrative data is shown.
            </p>

            {error ? (
              <p role="alert" className="mt-7 border-l-4 border-sky bg-sky/15 px-4 py-3 text-sm leading-6 text-warm">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || !configured}
              aria-busy={loading}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 border border-midnight bg-warm px-5 text-sm font-bold text-midnight transition-colors hover:bg-sky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 focus-visible:ring-offset-midnight disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span role="status" aria-live="polite">Opening Google sign-in…</span>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Continue with Google
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>

            {!configured ? (
              <p className="mt-4 text-sm leading-6 text-sky">
                Staff sign-in is unavailable until the server Supabase configuration is present.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
