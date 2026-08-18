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

export default function ImpactMetrics({ metrics }: { metrics: PublicMetric[] }) {
  return (
    <section className="bg-warm" aria-labelledby="impact-heading">
      <div className="site-shell mx-auto px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="editorial-grid items-end gap-y-8">
          <div className="col-span-12 lg:col-span-5">
            <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-cobalt">Measured with care</p>
            <h2 id="impact-heading" className="display-heading max-w-xl text-4xl text-midnight sm:text-5xl">What we can verify.</h2>
          </div>
          <p className="body-copy col-span-12 text-base text-ink/70 lg:col-span-6 lg:col-start-7">
            We publish only approved, source-dated measures here. When the record is not ready, we say so.
          </p>
        </div>

        {metrics.length > 0 ? (
          <div className="mt-14 grid border-t border-ink/30 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <article key={metric.key} className="border-b border-ink/30 py-7 sm:border-r sm:px-6 sm:first:pl-0 lg:px-8 lg:first:pl-0">
                <p className="font-display text-4xl font-semibold tracking-[-0.04em] text-midnight sm:text-5xl">
                  {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(metric.value)}
                  {metric.unit ? <span className="ml-2 text-xl text-cobalt">{metric.unit}</span> : null}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-ink">{metric.publicLabel}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/60">
                  Verified {metric.asOf}.{' '}
                  <a href={metric.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-cobalt underline decoration-cobalt/40 underline-offset-4 hover:text-midnight">
                    View source
                  </a>
                </p>
                <details className="mt-4 border-t border-ink/20 pt-3 text-sm text-ink/65">
                  <summary className="min-h-11 cursor-pointer py-2 font-semibold text-cobalt">How this is counted</summary>
                  <p className="pb-2 leading-6">{metric.methodologyNote}</p>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-14 border-y border-ink/30 py-10" data-testid="impact-empty-state">
            <p className="max-w-2xl text-2xl font-semibold leading-snug text-midnight sm:text-3xl">
              Verified impact data is being prepared. We publish the record when its source and date are ready.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
