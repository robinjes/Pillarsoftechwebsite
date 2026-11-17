import 'server-only'

import { JudgingConflictError, JudgingNotFoundError } from '@/lib/judging-server'
import { jsonNoStore } from '@/lib/volunteer-api'

/** Map judging errors to safe host-facing responses. */
export function judgingFailure(error: unknown, fallback: string) {
  if (error instanceof JudgingNotFoundError) return jsonNoStore({ error: error.message }, 404)
  if (error instanceof JudgingConflictError) return jsonNoStore({ error: error.message }, 409)
  return jsonNoStore({ error: fallback }, 503)
}
