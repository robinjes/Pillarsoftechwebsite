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
  if (metric.unit === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(metric.value)
  }
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(metric.value)}${metric.unit}`
}

function formatDate(asOf: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${asOf}T12:00:00.000Z`))
}

export default function ImpactMetrics({ metrics }: { metrics: PublicMetric[] }) {
  const displayMetrics = metrics.length > 0 ? metrics : previewImpactSnapshot

  return (
    <section className="signal-impact" aria-labelledby="impact-heading">
      <div className="signal-shell">
        <div className="signal-impact__intro">
          <p className="signal-mono signal-eyebrow">PUBLIC READOUT / 01</p>
          <h2 id="impact-heading">What the work adds up to.</h2>
          <p>Source-linked snapshots, dated so the number has somewhere to stand.</p>
        </div>
        <div className="signal-impact__metrics">
          {displayMetrics.slice(0, 3).map((metric) => (
            <article key={metric.key} className="signal-impact__metric">
              <p className="signal-impact__value">{formatValue(metric)}</p>
              <h3>{metric.publicLabel}</h3>
              <p className="signal-impact__meta">As of {formatDate(metric.asOf)}</p>
              <a href={metric.sourceUrl} target="_blank" rel="noreferrer" className="signal-mono">SOURCE <span aria-hidden="true">↗</span></a>
            </article>
          ))}
        </div>
        <details className="signal-impact__method">
          <summary className="signal-mono">READ THE METHOD</summary>
          <ul>
            {displayMetrics.slice(0, 3).map((metric) => <li key={metric.key}><strong>{metric.publicLabel}:</strong> {metric.methodologyNote}</li>)}
          </ul>
        </details>
      </div>
    </section>
  )
}
