import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { hashContactIdentity } from '@/lib/contact-abuse'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'

export const CONTACT_RATE_LIMIT_SCOPE = 'contact'
export const CONTACT_RATE_LIMIT_WINDOW_SECONDS = 10 * 60
export const CONTACT_RATE_LIMIT_MAX_ATTEMPTS = 5

export class DurableRateLimitError extends Error {
  constructor() {
    super('Contact abuse protection is temporarily unavailable.')
    this.name = 'DurableRateLimitError'
  }
}

function scopedBucketKey(scope: string, identity: unknown): string {
  // The key is deliberately composed only from a fixed scope and a keyed
  // digest. Raw IPs, forwarded headers, and other request identity values do
  // not cross this boundary into Supabase.
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(scope)) throw new DurableRateLimitError()
  return `${scope}:${hashContactIdentity(identity)}`
}

async function consumeBucket(
  client: SupabaseClient,
  bucketKey: string,
  windowSeconds: number,
  maxAttempts: number,
): Promise<boolean> {
  const { data, error } = await client.rpc('consume_chat_rate_limit', {
    p_bucket_key: bucketKey,
    p_window_seconds: windowSeconds,
    p_max_attempts: maxAttempts,
  })

  if (error || typeof data !== 'boolean') throw new DurableRateLimitError()
  return data
}

/**
 * Consume the contact bucket through the shared chat limiter RPC. The service
 * client is created only on the server and the helper converts both missing
 * configuration and database failures into one redacted error for the route.
 */
export async function allowContactAttemptDurably(identity: unknown): Promise<boolean> {
  try {
    const bucketKey = scopedBucketKey(CONTACT_RATE_LIMIT_SCOPE, identity)
    const client = createSupabaseServiceRoleClient()
    return await consumeBucket(
      client,
      bucketKey,
      CONTACT_RATE_LIMIT_WINDOW_SECONDS,
      CONTACT_RATE_LIMIT_MAX_ATTEMPTS,
    )
  } catch {
    throw new DurableRateLimitError()
  }
}

export const consumeContactRateLimit = allowContactAttemptDurably

/**
 * Shared entry point for the future visitor-chat limiter. Task 4 can choose a
 * separate scope while retaining the same table, RPC, hashing, and failure
 * semantics used by contact.
 */
export async function consumeChatRateLimit(
  scope: string,
  identity: unknown,
  options: { windowSeconds?: number; maxAttempts?: number } = {},
): Promise<boolean> {
  const windowSeconds = options.windowSeconds ?? CONTACT_RATE_LIMIT_WINDOW_SECONDS
  const maxAttempts = options.maxAttempts ?? CONTACT_RATE_LIMIT_MAX_ATTEMPTS
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 86_400) throw new DurableRateLimitError()
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) throw new DurableRateLimitError()

  try {
    const client = createSupabaseServiceRoleClient()
    return await consumeBucket(client, scopedBucketKey(scope, identity), windowSeconds, maxAttempts)
  } catch {
    throw new DurableRateLimitError()
  }
}
