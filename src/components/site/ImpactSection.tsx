import type { PublicImpactMetric } from '@/lib/content-contracts'

import { PageShell, SectionHeading } from '@/components/site/FamilyPrimitives'

function formatValue(metric: PublicImpactMetric): string {
  const value = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(metric.value)
  return metric.unit === '+' ? `${value}+` : `${value}${metric.unit ? ` ${metric.unit}` : ''}`
}

export default function ImpactSection({ metrics }: { metrics: PublicImpactMetric[] }) {
  return (
    <section className="impact-section section" id="impact" aria-labelledby="impact-heading">
      <PageShell>
        <SectionHeading
          className="impact-heading"
          eyebrow="How we keep track"
          title="We keep our impact notes close to the source."
          description="Published figures include a date, source, and methodology note so families can see what each number means. When a source is unavailable, we do not fill the gap with an estimate."
          id="impact-heading"
        />

        {metrics.length > 0 ? (
          <div className="impact-grid">
            {metrics.map((metric) => (
              <article className="impact-card" key={metric.key}>
                <p className="impact-value" aria-label={`${metric.publicLabel}: ${formatValue(metric)}`}>
                  {formatValue(metric)}
                </p>
                <h3 className="impact-label">{metric.publicLabel}</h3>
                <p className="impact-as-of">As of {metric.asOf}</p>
                <details className="impact-method">
                  <summary>How this is counted</summary>
                  <p>{metric.methodologyNote}</p>
                </details>
                <a className="impact-source focus-ring" href={metric.sourceUrl} target="_blank" rel="noreferrer">
                  See the source
                </a>
              </article>
            ))}
          </div>
        ) : (
          <p className="impact-empty" role="status">
            Impact notes are temporarily unavailable. We will show figures only when their source and method are available.
          </p>
        )}
      </PageShell>
    </section>
  )
}
