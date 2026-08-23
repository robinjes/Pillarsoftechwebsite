'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig, isSupabaseConfigured } from './config'

export { isSupabaseConfigured }

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig()
  if (!config) return null

  return createBrowserClient(config.url, config.anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: false,
    },
  })
}

// A browser client is safe to share within a browser tab. It never contains
// the server-only service-role credential.
export const supabase = createSupabaseBrowserClient()
