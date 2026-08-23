import { previewImpactSnapshot } from '@/data/impact-snapshot'

export type PublicMetric = {
  key: string
  value: number
  unit: string
  publicLabel: string
  asOf: string
  sourceUrl: string
  methodologyNote: string
  displayOrder: number
}

function formatValue(metric: PublicMetric): string {
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(metric.value)
  if (metric.unit === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(metric.value)
  }
  return `${number}${metric.unit}`
}

function formatDate(asOf: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${asOf}T12:00:00.000Z`))
}

export default function ImpactMetrics({ metrics }: { metrics: PublicMetric[] }) {
  // The repository provides this same fallback, but keeping the component
  // defensive makes local preview and a transient empty response useful.
  const displayMetrics = metrics.length > 0 ? metrics : previewImpactSnapshot

  return (
    <section className="bg-warm" aria-labelledby="impact-heading">
      <div className="site-shell mx-auto px-5 py-14 sm:px-8 lg:px-10 lg:py-16">
        <div className="flex flex-col gap-5 border-y border-ink/25 py-5 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="shrink-0">
            <h2 id="impact-heading" className="font-display text-2xl font-semibold tracking-[-0.03em] text-midnight sm:text-3xl">
              The work, in numbers.
            </h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-ink/65">Source-linked snapshots from the public record.</p>
          </div>

          <div className="grid flex-1 divide-y divide-ink/20 border-t border-ink/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:border-t-0">
            {displayMetrics.slice(0, 3).map((metric) => (
              <article key={metric.key} className="py-4 sm:px-5 sm:py-1 first:sm:pl-0 last:sm:pr-0">
                <p className="font-display text-3xl font-semibold tracking-[-0.04em] text-midnight sm:text-4xl">
                  {formatValue(metric)}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-ink">{metric.publicLabel}</h3>
                <p className="mt-1 text-xs leading-5 text-ink/60">
                  As of {formatDate(metric.asOf)} ·{' '}
                  <a href={metric.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center px-1 font-semibold text-cobalt underline decoration-cobalt/40 underline-offset-4 hover:text-midnight">
                    Source
                  </a>
                </p>
              </article>
            ))}
          </div>
        </div>

        <details className="mt-4 max-w-3xl text-sm text-ink/70">
          <summary className="inline-flex min-h-11 cursor-pointer items-center py-2 font-semibold text-cobalt underline decoration-cobalt/40 underline-offset-4 hover:text-midnight">
            How these numbers are counted
          </summary>
          <ul className="mt-2 space-y-2 border-l-2 border-sky pl-4 leading-6">
            {displayMetrics.slice(0, 3).map((metric) => (
              <li key={metric.key}>
                <span className="font-semibold text-midnight">{metric.publicLabel}:</span> {metric.methodologyNote}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  )
}
