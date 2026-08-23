'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Fredoka, Space_Grotesk } from 'next/font/google'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { volunteerService } from '@/lib/volunteerService'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

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

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('error') as LoginMessage
    setError(messageFor(reason))
  }, [])

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured()) {
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
    <main className="min-h-screen bg-primary flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden relative">
      <div className="absolute top-20 left-10 w-64 h-64 bg-accent/20 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
          <div className="bg-accent/20 p-4 rounded-full">
            <ShieldCheck className="w-12 h-12 text-accent" />
          </div>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mt-6 text-center text-4xl font-extrabold text-white ${fredoka.className}`}
        >
          Staff access
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mt-2 text-center text-sm text-blue-200 ${spaceGrotesk.className}`}
        >
          Sign in with the Google account granted staff access by a database owner.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-dark/80 backdrop-blur-xl py-8 px-4 shadow-2xl border border-white/10 sm:rounded-3xl sm:px-10">
          {error && (
            <p role="alert" className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-center text-sm text-amber-100">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !isSupabaseConfigured()}
            className={`w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold text-slate-900 bg-white hover:bg-gray-100 transition-all duration-200 group disabled:cursor-not-allowed disabled:opacity-50 ${spaceGrotesk.className}`}
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {!isSupabaseConfigured() && (
            <p className={`mt-4 text-center text-xs text-amber-200 ${spaceGrotesk.className}`}>
              Staff sign-in is unavailable until the server Supabase configuration is present.
            </p>
          )}
        </div>
      </motion.div>
    </main>
  )
}
