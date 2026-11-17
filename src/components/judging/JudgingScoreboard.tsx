'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, Download, Trophy } from 'lucide-react'

import {
  isScoreComplete,
  MAX_TOTAL,
  RUBRIC,
  scoreTotal,
  type JudgingAdminScore,
  type JudgingContestant,
  type JudgingEventDetail,
} from '@/lib/judging-contracts'

import { fileSlug, secondaryButton } from '../feedback/admin-ui'

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
export function summarizeJudging(detail: JudgingEventDetail): ContestantSummary[] {
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

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function download(name: string, rows: Array<Array<string | number | null>>) {
  const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

const fmt = (value: number | null) => (value === null ? '–' : value.toFixed(1))

export default function JudgingScoreboard({ detail }: { detail: JudgingEventDetail }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const summaries = summarizeJudging(detail)
  const judgeName = new Map(detail.judges.map((judge) => [judge.id, judge.name]))
  const slug = fileSlug(detail.event.title)

  function downloadRankings() {
    download(`${slug}-rankings.csv`, [
      ['Rank', 'Student', 'Project', `Average total (/${MAX_TOTAL})`, ...RUBRIC.map((item) => `${item.label} (avg)`), 'Complete rubrics', 'Partial rubrics'],
      ...summaries.map((summary, index) => [
        summary.average === null ? '' : index + 1,
        summary.contestant.name,
        summary.contestant.project,
        summary.average === null ? '' : summary.average.toFixed(2),
        ...RUBRIC.map((item) => (summary.categoryAverages[item.key] === null ? '' : (summary.categoryAverages[item.key] as number).toFixed(2))),
        summary.complete.length,
        summary.scores.length - summary.complete.length,
      ]),
    ])
  }

  function downloadAll() {
    download(`${slug}-all-scores.csv`, [
      ['Student', 'Project', 'Judge', ...RUBRIC.map((item) => item.label), 'Total', 'Complete', 'Comment', 'Last saved'],
      ...summaries.flatMap((summary) =>
        summary.scores.map((score) => [
          summary.contestant.name,
          summary.contestant.project,
          judgeName.get(score.judgeId) ?? 'Removed judge',
          ...RUBRIC.map((item) => score[item.key]),
          scoreTotal(score),
          isScoreComplete(score) ? 'yes' : 'no',
          score.comment,
          score.updatedAt,
        ]),
      ),
    ])
  }

  return (
    <section aria-labelledby="scoreboard-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="scoreboard-heading" className="flex items-center gap-2 font-display text-xl font-semibold text-midnight">
          <Trophy className="h-5 w-5" aria-hidden="true" /> Scoreboard
        </h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} disabled={!detail.scores.length} onClick={downloadRankings}>
            <Download className="h-4 w-4" aria-hidden="true" /> Rankings CSV
          </button>
          <button type="button" className={secondaryButton} disabled={!detail.scores.length} onClick={downloadAll}>
            <Download className="h-4 w-4" aria-hidden="true" /> All scores CSV
          </button>
        </div>
      </div>
      <p className="text-sm text-ink/65">Ranked by the average of complete rubrics (all five categories scored). Click a student for each judge&rsquo;s scores and comments.</p>

      {summaries.length === 0 ? (
        <p className="border border-dashed border-midnight/30 p-6 text-center text-ink/65">Add students to see the scoreboard.</p>
      ) : (
        <div className="overflow-x-auto border border-midnight/25 bg-warm">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-sky/60 text-midnight">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2 text-right">Avg / {MAX_TOTAL}</th>
                {RUBRIC.map((item) => <th key={item.key} className="px-2 py-2 text-right" title={item.label}>{item.label.split(' +')[0]}</th>)}
                <th className="px-3 py-2 text-right">Judges</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary, index) => {
                const open = openId === summary.contestant.id
                return (
                  <Fragment key={summary.contestant.id}>
                    <tr className="border-t border-midnight/15">
                      <td className="px-3 py-2 font-bold text-midnight">{summary.average === null ? '' : index + 1}</td>
                      <td className="px-3 py-2">
                        <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : summary.contestant.id)} className="flex items-center gap-1 text-left font-semibold text-midnight hover:underline">
                          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                          {summary.contestant.name}
                        </button>
                        {summary.contestant.project ? <span className="block pl-5 text-xs text-ink/60">{summary.contestant.project}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-right font-display text-lg font-semibold text-midnight">{fmt(summary.average)}</td>
                      {RUBRIC.map((item) => <td key={item.key} className="px-2 py-2 text-right tabular-nums">{fmt(summary.categoryAverages[item.key])}</td>)}
                      <td className="px-3 py-2 text-right tabular-nums">
                        {summary.complete.length}
                        {summary.scores.length > summary.complete.length ? <span className="text-ink/55"> +{summary.scores.length - summary.complete.length} partial</span> : null}
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-white/50">
                        <td colSpan={RUBRIC.length + 4} className="px-3 py-3">
                          {summary.scores.length === 0 ? (
                            <p className="text-ink/60">No judge has scored {summary.contestant.name} yet.</p>
                          ) : (
                            <ul className="flex flex-col gap-2">
                              {summary.scores.map((score) => (
                                <li key={score.judgeId} className="border border-midnight/15 bg-warm p-3">
                                  <p className="font-semibold text-midnight">
                                    {judgeName.get(score.judgeId) ?? 'Removed judge'}: {scoreTotal(score)} / {MAX_TOTAL}
                                    {isScoreComplete(score) ? null : <span className="ml-2 text-xs font-bold uppercase text-ink/55">partial</span>}
                                  </p>
                                  <p className="mt-1 text-xs text-ink/70">
                                    {RUBRIC.map((item) => `${item.label.split(' +')[0]} ${score[item.key] ?? '–'}`).join(' · ')}
                                  </p>
                                  {score.comment ? <p className="mt-2 whitespace-pre-line border-l-4 border-sky pl-3 text-sm text-ink">{score.comment}</p> : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
