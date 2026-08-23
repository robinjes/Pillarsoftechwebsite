'use client'

// Compatibility exports for existing browser components. This module only
// creates the publishable-key browser client; service-role credentials never
// cross this boundary and an unconfigured app has no mock auth fallback.
export {
  createSupabaseBrowserClient as createClient,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase/client'
