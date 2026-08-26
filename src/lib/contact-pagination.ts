import { z } from 'zod'

const cursorPayloadSchema = z.object({
  createdAt: z.string().trim().refine((value) => Number.isFinite(Date.parse(value))),
  id: z.uuid(),
}).strict()

export type ContactCursor = z.infer<typeof cursorPayloadSchema>

/**
 * Contact cursors are opaque to the browser, but contain only the two indexed
 * keyset values needed by the staff list query. The values are validated again
 * after decoding so a cursor can never become a PostgREST filter injection.
 */
export function encodeContactCursor(createdAt: string, id: string): string {
  const parsed = cursorPayloadSchema.safeParse({ createdAt, id })
  if (!parsed.success) throw new Error('Invalid contact cursor values.')
  return Buffer.from(JSON.stringify(parsed.data), 'utf8').toString('base64url')
}

export function decodeContactCursor(value: unknown): ContactCursor | null {
  if (typeof value !== 'string' || value.length < 1 || value.length > 256) return null

  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8')
    // A canonical round-trip rejects strings that Buffer silently accepts
    // despite invalid base64url characters.
    if (Buffer.from(decoded, 'utf8').toString('base64url') !== value) return null
    const parsed = cursorPayloadSchema.safeParse(JSON.parse(decoded))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
