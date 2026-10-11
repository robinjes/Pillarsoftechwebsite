import type { PublicImpactMetric } from '@/lib/content-contracts'

import { PageShell, SectionHeading } from '@/components/site/FamilyPrimitives'

function formatValue(metric: PublicImpactMetric): string {
  const value = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(metric.value)
  return metric.unit === '+' ? `${value}+` : `${value}${metric.unit ? ` ${metric.unit}` : ''}`
}

export default function ImpactSection({ metrics }: { metrics: PublicImpactMetric[] }) {
  const visibleMetrics = metrics.filter((metric) => metric.key !== 'hcb_revenue')

  return (
    <section className="impact-section section" id="impact" aria-labelledby="impact-heading">
      <PageShell>
        <SectionHeading
          className="impact-heading"
          eyebrow="Our community in numbers"
          title="What we’ve done together."
          description="Behind every number are people who showed up to learn and help. Each figure includes a date, source, and explanation of how we counted it."
          id="impact-heading"
        />

        {visibleMetrics.length > 0 ? (
          <div className="impact-grid">
            {visibleMetrics.map((metric) => (
              <article className="impact-card" key={metric.key}>
                <p className="impact-value" aria-label={`${metric.publicLabel}: ${formatValue(metric)}`}>
                  {formatValue(metric)}
                </p>
                <h3 className="impact-label">{metric.publicLabel}</h3>
                <p className="impact-as-of">As of {metric.asOf}</p>
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
