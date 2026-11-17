import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

// PostgREST refuses to embed a table that is linked in both directions
// (e.g. qna_sessions <-> qna_questions) unless the foreign key is named.
// These admin count embeds broke in production once; keep them explicit.
describe('admin count embeds', () => {
  it.each([
    ['src/lib/qna-server.ts', 'qna_questions!qna_questions_session_id_fkey(count)'],
    ['src/lib/judging-server.ts', 'judging_contestants!judging_contestants_event_id_fkey(count)'],
    ['src/lib/judging-server.ts', 'judging_judges!judging_judges_event_id_fkey(count)'],
  ])('%s names the foreign key for %s', (file, embed) => {
    const source = readFileSync(path.join(process.cwd(), file), 'utf8')
    expect(source).toContain(embed)
    expect(source).not.toMatch(/\b(qna_questions|judging_contestants|judging_judges)\(count\)/)
  })
})
