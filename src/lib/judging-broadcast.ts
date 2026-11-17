import { isScoreComplete, scoreTotal, type JudgingEventDetail } from '@/lib/judging-contracts'
import { summarizeJudging } from '@/lib/judging-summary'

/** Explicit allowlist: broadcast clients never receive codes, comments, or judge IDs. */
export function broadcastSnapshot(detail: JudgingEventDetail) {
  const current = detail.contestants.find((item) => item.id === detail.event.currentContestantId)
  const summaries = summarizeJudging(detail)
  return {
    title: detail.event.title,
    timer: detail.event.timer,
    final: detail.event.scoresLocked,
    current: current ? {
      name: current.name,
      project: current.project,
      average: summaries.find((item) => item.contestant.id === current.id)?.average ?? null,
      judges: detail.judges.map((judge) => {
        const score = detail.scores.find((item) => item.judgeId === judge.id && item.contestantId === current.id)
        return { name: judge.name, total: score && isScoreComplete(score) ? scoreTotal(score) : null }
      }),
    } : null,
    standings: summaries.map((item, index) => ({
      name: item.contestant.name,
      project: item.contestant.project,
      average: item.average,
      completed: item.complete.length,
      rank: item.average === null ? null : summaries.findIndex((other) => other.average === item.average) + 1,
      position: index,
    })),
  }
}

export type JudgingBroadcast = ReturnType<typeof broadcastSnapshot>
export type BroadcastMode = 'live' | 'ticker' | 'results'
