export const SUPABASE_URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL'
export const SUPABASE_ANON_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
export const SUPABASE_SERVICE_ROLE_KEY_ENV = 'SUPABASE_SERVICE_ROLE_KEY'
export const SITE_URL_ENV = 'NEXT_PUBLIC_SITE_URL'

export interface SupabasePublicConfig {
  url: string
  anonKey: string
}

export interface SupabaseServiceConfig extends SupabasePublicConfig {
  serviceRoleKey: string
}

export class SupabaseConfigurationError extends Error {
  readonly code = 'supabase_configuration_unavailable'

  constructor(message = 'Supabase server configuration is unavailable.') {
    super(message)
    this.name = 'SupabaseConfigurationError'
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  // Keep public env references static so Next.js can inline them into the
  // browser bundle. Dynamic process.env lookups are not reliably replaced.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) return null

  try {
    const parsedUrl = new URL(url)
    const isLocalHttp =
      parsedUrl.protocol === 'http:' &&
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
    if (parsedUrl.protocol !== 'https:' && !isLocalHttp) return null
  } catch {
    return null
  }

  return { url, anonKey }
}

export function getSupabaseServiceConfig(): SupabaseServiceConfig | null {
  const publicConfig = getSupabasePublicConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!publicConfig || !serviceRoleKey) return null

  return { ...publicConfig, serviceRoleKey }
}

export function getSiteUrl(): string | null {
  // Keep the public site URL reference static for the same reason as the
  // browser Supabase variables above.
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!value) return null

  try {
    const url = new URL(value)
    const isLocalHttp =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    if (url.protocol !== 'https:' && !isLocalHttp) return null
    return url.origin
  } catch {
    return null
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null
}
