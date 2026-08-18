import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, HeartHandshake } from 'lucide-react'

const donationUrl = 'https://hcb.hackclub.com/donations/start/pillars-of-tech'

export default function FundraiserPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--cream)] pt-16 text-[var(--ink)]">
      <header className="border-b-2 border-[var(--ink)]/20">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <HeartHandshake aria-hidden="true" className="h-8 w-8 text-[var(--cobalt)]" strokeWidth={1.7} />
              <div>
                <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">Support / HCB checkout</p>
                <h1 className="mt-2 font-display text-3xl leading-tight text-[var(--midnight)] sm:text-4xl">Support the work.</h1>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 self-start border-2 border-[var(--ink)] px-4 py-3 font-body text-sm font-bold text-[var(--midnight)] transition hover:bg-[var(--paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)] sm:self-auto"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--ink)]/20 bg-[var(--paper)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-24">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-[var(--cobalt)]">A clear route to give</p>
            <h2 className="mt-4 max-w-xl font-display text-5xl leading-[0.98] text-[var(--midnight)] sm:text-6xl">Keep the learning hands-on.</h2>
            <p className="mt-6 max-w-xl font-body text-lg leading-8 text-[var(--ink)]/70">
              Donations are processed through Hack Club. Use the embedded checkout below or open the same secure donation page directly.
            </p>
            <p className="mt-6 border-l-4 border-[var(--sky)] pl-4 font-body text-sm leading-6 text-[var(--ink)]/70">
              Hack Club handles checkout. This site does not receive your card details.
            </p>
            <a
              href={donationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-11 items-center gap-2 bg-[var(--midnight)] px-5 py-3 font-body text-sm font-bold text-[var(--cream)] transition hover:bg-[var(--cobalt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
            >
              Open secure donation page
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          <div className="min-w-0 border-2 border-[var(--ink)]/25 bg-[var(--cream)] p-2 sm:p-3">
            <iframe
              src={donationUrl}
              title="Pillars of Tech donation checkout"
              className="h-[720px] w-full border-0 sm:h-[780px]"
              scrolling="yes"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              allowFullScreen
              loading="lazy"
            />
            <p className="border-t border-[var(--ink)]/20 px-3 py-3 font-body text-xs leading-5 text-[var(--ink)]/60">
              If the embedded checkout does not load, use the secure donation page link above.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
