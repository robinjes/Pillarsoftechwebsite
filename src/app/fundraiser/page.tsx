import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, HeartHandshake } from 'lucide-react'
import ExternalEmbedOptIn from '@/components/ExternalEmbedOptIn'

const donationUrl = 'https://hcb.hackclub.com/donations/start/pillars-of-tech'
const ledgerUrl = 'https://hcb.hackclub.com/pillars-of-tech/transactions'

export default function FundraiserPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] text-[var(--ink)]">
      <header className="border-b border-[var(--ink)]/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <HeartHandshake aria-hidden="true" className="h-7 w-7 text-[var(--cobalt)]" strokeWidth={1.7} />
            <div>
              <p className="font-body text-sm font-bold text-[var(--midnight)]">Support Pillars of Tech</p>
              <p className="font-body text-xs text-[var(--ink)]/60">A direct route to the work</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 border border-[var(--ink)]/40 px-4 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Home
          </Link>
        </div>
      </header>

      <section className="relative isolate min-h-[30rem] overflow-hidden bg-[var(--midnight)] text-[var(--cream)] sm:min-h-[36rem]">
        <Image
          src="/images/events/wildcat-tank/Outdoor2.JPG"
          alt="A student volunteer helps a younger participant at an outdoor foil-boat activity table."
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[var(--midnight)]/75" aria-hidden="true" />
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
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-24">
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
                className="inline-flex min-h-11 items-center gap-2 bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
              >
                Open secure donation page
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <a
                href={ledgerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 border border-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
              >
                View transparent finances
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="min-w-0 border border-[var(--ink)]/25 bg-[var(--cream)] p-2 sm:p-3">
            <ExternalEmbedOptIn
              src={donationUrl}
              title="Pillars of Tech donation checkout"
              directLabel="Open secure donation page"
              loadLabel="Load secure checkout"
              description="This optional panel is hosted by Hack Club and loads only when you ask for it."
              fallbackCopy="If the embedded checkout does not load, use the secure donation page directly. Hack Club handles checkout; this site does not receive your card details."
            />
          </div>
        </div>
      </section>
    </main>
  )
}
