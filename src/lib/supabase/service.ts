import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServiceConfig, SupabaseConfigurationError } from './config'

export function createSupabaseServiceRoleClient(): SupabaseClient {
  const config = getSupabaseServiceConfig()
  if (!config) {
    throw new SupabaseConfigurationError(
      'Supabase service-role configuration is unavailable for this server operation.'
    )
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
