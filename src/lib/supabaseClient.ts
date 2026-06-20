import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Initialize client. Will be null if keys are not configured in .env.local,
// enabling a seamless fallback to local mock mode for development and testing.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        flowType: 'pkce',
      },
    })
  : null

export const isSupabaseConfigured = () => !!supabase
