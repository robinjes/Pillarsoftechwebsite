import { z } from 'zod'
import type { JudgingEventDetail } from '@/lib/judging-contracts'
import { normalizeQnaText } from '@/lib/qna-contracts'
import { summarizeJudging } from '@/lib/judging-summary'

export const DEFAULT_AWARDS_MESSAGE = 'After all presentations'
export const audienceControlSchema = z.strictObject({
  eventId: z.uuid(),
  awardsMessage: z.string().max(480).transform(normalizeQnaText).pipe(z.string().max(240)).optional(),
  resultsReleased: z.boolean().optional(),
}).refine((input) => input.awardsMessage !== undefined || input.resultsReleased !== undefined)

/** A separate public contract. Unreleased scores never enter the response. */
export function audienceSnapshot(detail: Pick<JudgingEventDetail, 'event' | 'contestants' | 'scores'>) {
  const index = detail.contestants.findIndex((student) => student.id === detail.event.currentContestantId)
  const student = (position: number) => {
    const item = detail.contestants[position]
    return item ? { name: item.name, project: item.project } : null
  }
  const released = detail.event.resultsReleased === true && detail.event.scoresLocked
  const rankings = released ? summarizeJudging(detail) : []
  return {
    title: detail.event.title,
    isLive: detail.event.isCurrent,
    awardsMessage: detail.event.awardsMessage || DEFAULT_AWARDS_MESSAGE,
    presentationNumber: index >= 0 ? index + 1 : null,
    totalPresentations: detail.contestants.length,
    current: detail.event.isCurrent && index >= 0 ? student(index) : null,
    next: detail.event.isCurrent ? student(index >= 0 ? index + 1 : 0) : null,
    resultsReleased: released,
    results: released ? rankings.map((row) => ({
      name: row.contestant.name,
      project: row.contestant.project,
      average: row.average,
      rank: row.average === null ? null : rankings.findIndex((other) => other.average === row.average) + 1,
    })) : null,
  }
}
export type JudgingAudienceState = ReturnType<typeof audienceSnapshot>
