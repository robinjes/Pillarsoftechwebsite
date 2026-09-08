import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import ExternalEmbedOptIn from '@/components/ExternalEmbedOptIn'

const donationUrl = 'https://hcb.hackclub.com/donations/start/pillars-of-tech'
const ledgerUrl = 'https://hcb.hackclub.com/pillars-of-tech/transactions'

export const metadata: Metadata = {
  title: 'Support the Work | Pillars of Tech',
  description: 'Support hands-on STEM learning through Hack Club’s secure donation page and public transaction ledger.',
}

export default function FundraiserPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] text-[var(--ink)]">
      <section className="relative isolate min-h-[30rem] overflow-hidden rounded-b-[2rem] bg-[var(--midnight)] text-[var(--cream)] sm:min-h-[36rem]">
        <Link
          href="/"
          className="absolute left-5 top-5 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-[var(--cream)] bg-[var(--midnight)]/75 px-4 py-2 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--midnight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--midnight)] sm:left-8 lg:left-12"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Home
        </Link>
        <Image
          src="/images/events/wildcat-tank/Outdoor2.JPG"
          alt="A student volunteer helps a younger participant at an outdoor foil-boat activity table."
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,31,58,0.92)_0%,rgba(11,31,58,0.78)_48%,rgba(11,31,58,0.48)_100%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex min-h-[30rem] max-w-7xl items-end px-5 py-12 sm:min-h-[36rem] sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="font-body text-sm font-semibold text-[var(--sky)]">A gift becomes a workshop</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[0.98] text-[var(--cream)] sm:text-[4.35rem]">Keep the learning hands-on.</h1>
            <p className="mt-6 max-w-xl font-body text-base leading-7 text-[var(--cream)]/80 sm:text-lg">
              Your support helps a student get closer to the tools, people, and projects that make STEM feel possible.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 lg:px-12 lg:py-20">
          <div>
            <h2 className="max-w-md font-display text-4xl leading-tight text-[var(--midnight)] sm:text-5xl">Choose the secure path.</h2>
            <p className="mt-5 max-w-md font-body text-base leading-7 text-[var(--ink)]/70">
              Donations are processed through Hack Club. Open the secure donation page directly, or choose to load the optional checkout panel.
            </p>
            <p className="mt-6 border-l-2 border-[var(--sky)] pl-4 font-body text-sm leading-6 text-[var(--ink)]/70">
              Hack Club handles checkout. This site does not receive your card details.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <a
                href={donationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-[var(--midnight)] bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
              >
                Open Secure Donation Page
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <a
                href={ledgerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
              >
                View Transparent Finances
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="min-w-0 rounded-[2rem] border border-[var(--ink)]/25 bg-[var(--cream)] p-2 sm:p-3">
            <ExternalEmbedOptIn
              src={donationUrl}
              title="Pillars of Tech donation checkout"
              directLabel="Open Secure Donation Page"
              loadLabel="Load Secure Checkout"
              description="This optional panel is hosted by Hack Club and loads only when you ask for it."
              fallbackCopy="If the embedded checkout does not load, use the secure donation page directly. Hack Club handles checkout; this site does not receive your card details."
            />
          </div>
        </div>
      </section>
    </main>
  )
}
