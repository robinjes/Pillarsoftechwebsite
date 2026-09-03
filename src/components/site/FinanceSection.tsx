import { ArrowUpRight } from 'lucide-react'

import { PageShell } from '@/components/site/FamilyPrimitives'

const financeUrl = 'https://hcb.hackclub.com/pillars-of-tech/transactions'
const donationUrl = 'https://hcb.hackclub.com/donations/start/pillars-of-tech'

export default function FinanceSection() {
  return (
    <section className="finance-section section" aria-labelledby="finance-heading">
      <PageShell className="finance-layout">
        <div>
          <p className="eyebrow">Financial home</p>
          <h2 id="finance-heading" className="family-heading">Clear enough to follow.</h2>
        </div>
        <div className="finance-copy long-form-copy">
          <p>
            <strong>Fiscally sponsored through Hack Club</strong>, Pillars of Tech shares its HCB transaction record for financial transparency.
          </p>
          <div className="flex flex-wrap gap-5">
            <a
              href={financeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-link focus-ring"
            >
              Review HCB Transactions <ArrowUpRight aria-hidden="true" />
            </a>
            <a
              href={donationUrl}
              target="_blank"
              rel="noreferrer"
              className="text-link focus-ring"
            >
              Support The Work <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </PageShell>
    </section>
  )
}
