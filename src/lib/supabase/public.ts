import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getSupabasePublicConfig } from './config'

/**
 * A server-side anonymous client for content that is safe to cache publicly.
 *
 * This deliberately does not use @supabase/ssr: public content must never be
 * widened by an authenticated browser session or by cookies carried on the
 * request that rendered the page.
 */
export function createSupabasePublicClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig()
  if (!config) return null

  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
