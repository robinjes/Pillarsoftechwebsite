import { isScoreComplete, RUBRIC, scoreTotal, type JudgingAdminScore, type JudgingContestant, type JudgingEventDetail } from '@/lib/judging-contracts'

export interface ContestantSummary {
  contestant: JudgingContestant
  scores: JudgingAdminScore[]
  complete: JudgingAdminScore[]
  average: number | null
  categoryAverages: Record<string, number | null>
}

const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null)

/**
 * Rank by the average of complete rubrics, so a student is not penalized
 * when a judge stepped out; partial rubrics are shown but not counted.
 */
export function summarizeJudging(detail: Pick<JudgingEventDetail, 'contestants' | 'scores'>): ContestantSummary[] {
  return detail.contestants
    .map((contestant) => {
      const scores = detail.scores.filter((score) => score.contestantId === contestant.id)
      const complete = scores.filter(isScoreComplete)
      return {
        contestant,
        scores,
        complete,
        average: mean(complete.map(scoreTotal)),
        categoryAverages: Object.fromEntries(RUBRIC.map((item) => [item.key, mean(complete.map((score) => score[item.key] as number))])),
      }
    })
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
}

