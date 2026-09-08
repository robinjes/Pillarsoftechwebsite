'use client'

import { ArrowUpRight, ExternalLink } from 'lucide-react'

type PodiumEntry = {
  productName: string
  total: number
  rank: number
  videoUrl?: string
  timestampLabel?: string
}

type WildcatTankPodiumProps = {
  topThree: PodiumEntry[]
  remainingResults: PodiumEntry[]
}

const getOrdinalLabel = (value: number) => {
  const mod10 = value % 10
  const mod100 = value % 100
  const prefix = String(value)

  if (mod10 === 1 && mod100 !== 11) return prefix + 'st'
  if (mod10 === 2 && mod100 !== 12) return prefix + 'nd'
  if (mod10 === 3 && mod100 !== 13) return prefix + 'rd'

  return prefix + 'th'
}

const placeLabel = (rank: number) => {
  if (rank === 1) return 'First place'
  if (rank === 2) return 'Second place'
  if (rank === 3) return 'Third place'
  return getOrdinalLabel(rank)
}

export default function WildcatTankPodium({ topThree, remainingResults }: WildcatTankPodiumProps) {
  return (
    <>
      <div className="mt-8 grid gap-px border-2 border-[var(--ink)] bg-[var(--ink)] lg:grid-cols-3" aria-label="Top three Wildcat Tank results">
        {topThree.map((entry) => {
          const content = (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cobalt)]">{placeLabel(entry.rank)}</p>
              <h3 className="mt-4 font-display text-3xl leading-none text-[var(--midnight)]">{entry.productName}</h3>
              <p className="mt-5 text-2xl font-bold text-[var(--midnight)]">{entry.total.toLocaleString()} <span className="text-sm font-semibold text-[var(--ink)]/65">points</span></p>
              {entry.timestampLabel ? <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink)]/65">Presentation clip {entry.timestampLabel}</p> : null}
              {entry.videoUrl ? <span className="mt-6 inline-flex min-h-11 items-center gap-2 border-2 border-[var(--cobalt)] px-4 py-2 text-sm font-bold text-[var(--cobalt)] group-hover:bg-[var(--sky)]">Open presentation clip <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span> : null}
            </>
          )
          const className = 'group min-h-64 bg-[var(--paper)] p-6 text-left transition-colors hover:bg-[var(--sky)] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--cobalt)] sm:p-8'

          return entry.videoUrl ? (
            <a key={entry.productName} href={entry.videoUrl} target="_blank" rel="noopener noreferrer" aria-label={'Open ' + entry.productName + ' presentation clip'} className={className}>
              {content}
            </a>
          ) : (
            <article key={entry.productName} className={className}>
              {content}
            </article>
          )
        })}
      </div>

      <div className="mt-8 overflow-x-auto border-2 border-[var(--ink)]" aria-label="Remaining Wildcat Tank results">
        <div className="min-w-[36rem]">
          <div className="grid grid-cols-[6rem_minmax(0,1fr)_8rem] bg-[var(--midnight)] px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--cream)] sm:grid-cols-[7rem_minmax(0,1fr)_9rem]">
            <div>Place</div>
            <div>Product name</div>
            <div className="text-right">Points</div>
          </div>
          {remainingResults.map((entry) => {
            const row = (
              <>
                <div className="font-bold text-[var(--cobalt)]">{getOrdinalLabel(entry.rank)}</div>
                <div className="font-semibold text-[var(--midnight)]">
                  {entry.productName}
                  {entry.timestampLabel ? <span className="ml-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink)]/60">Clip {entry.timestampLabel}</span> : null}
                </div>
                <div className="text-right font-bold text-[var(--midnight)]">{entry.total.toLocaleString()}</div>
              </>
            )
            const className = 'grid w-full grid-cols-[6rem_minmax(0,1fr)_8rem] items-center gap-2 border-t border-[var(--ink)]/30 bg-[var(--paper)] px-4 py-4 text-left text-sm hover:bg-[var(--sky)] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--cobalt)] sm:grid-cols-[7rem_minmax(0,1fr)_9rem]'

            return entry.videoUrl ? (
              <a key={entry.productName} href={entry.videoUrl} target="_blank" rel="noopener noreferrer" aria-label={'Open ' + entry.productName + ' presentation clip'} className={className}>
                {row}
              </a>
            ) : (
              <div key={entry.productName} className={className}>
                {row}
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm leading-7 text-[var(--ink)]/70">
        <ExternalLink className="h-4 w-4 text-[var(--cobalt)]" aria-hidden="true" />
        Presentation clips open in a new tab at their recorded timestamps.
      </p>
    </>
  )
}
