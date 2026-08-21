import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, ReceiptText } from 'lucide-react'
import ExternalEmbedOptIn from '@/components/ExternalEmbedOptIn'
import SignalPageIntro from '@/components/site/SignalPageIntro'

const donationUrl = 'https://hcb.hackclub.com/donations/start/pillars-of-tech'
const ledgerUrl = 'https://hcb.hackclub.com/pillars-of-tech/transactions'

export default function FundraiserPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--bone)] text-[var(--carbon)]">
      <div className="border-b border-[var(--carbon)]/30 bg-[var(--bone)]">
        <div className="signal-shell flex min-h-16 items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <ReceiptText aria-hidden="true" className="h-6 w-6 text-[var(--signal-orange)]" strokeWidth={1.7} />
            <div>
              <p className="signal-mono">PUBLIC RECEIPT / SUPPORT</p>
              <p className="mt-1 font-body text-xs text-[var(--carbon)]/60">Pillars of Tech · open route</p>
            </div>
          </div>
          <Link href="/" className="signal-button signal-button--line">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>

      <SignalPageIntro
        eyebrow="SUPPORT / 01"
        title="Put the next tool on the table."
        description="A gift helps keep hands-on STEM sessions stocked, open, and ready for the next student to try something real."
        image={{
          src: '/images/events/wildcat-tank/Outdoor2.JPG',
          alt: 'A volunteer helps children compare marshmallow-and-toothpick structures at an outdoor activity table.',
        }}
        tone="carbon"
        imagePosition="center"
        actions={(
          <>
            <a href={donationUrl} target="_blank" rel="noopener noreferrer" className="signal-button signal-button--orange">
              Open secure donation page
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href={ledgerUrl} target="_blank" rel="noopener noreferrer" className="signal-button signal-button--light">
              Read the ledger
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </>
        )}
      />

      <section className="border-b border-[var(--carbon)]/25 bg-[var(--bone)]" aria-labelledby="support-route-title">
        <div className="signal-shell grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.74fr_1.26fr] lg:gap-16 lg:py-28">
          <div>
            <p className="signal-mono text-[var(--signal-orange)]">RECEIPT / 02 · HOW IT MOVES</p>
            <h2 id="support-route-title" className="mt-4 max-w-md font-display text-4xl font-semibold leading-[0.92] tracking-[-0.055em] text-[var(--carbon)] sm:text-5xl">Give once. See the route.</h2>
            <p className="mt-5 max-w-md font-body text-base leading-7 text-[var(--carbon)]/70">Hack Club handles the checkout and ledger. This site never asks for or stores your payment-card details.</p>

            <dl className="mt-9 divide-y divide-[var(--carbon)]/25 border-y border-[var(--carbon)]/25">
              <div className="grid grid-cols-[4rem_1fr] gap-4 py-4">
                <dt className="signal-mono text-[var(--signal-orange)]">01</dt>
                <dd className="font-body text-sm leading-6 text-[var(--carbon)]/75">Choose the secure Hack Club donation route.</dd>
              </div>
              <div className="grid grid-cols-[4rem_1fr] gap-4 py-4">
                <dt className="signal-mono text-[var(--signal-orange)]">02</dt>
                <dd className="font-body text-sm leading-6 text-[var(--carbon)]/75">Support materials, transport, and welcoming workshop rooms.</dd>
              </div>
              <div className="grid grid-cols-[4rem_1fr] gap-4 py-4">
                <dt className="signal-mono text-[var(--signal-orange)]">03</dt>
                <dd className="font-body text-sm leading-6 text-[var(--carbon)]/75">Check the public ledger whenever you want the paper trail.</dd>
              </div>
            </dl>

            <figure className="relative mt-9 aspect-[4/3] overflow-hidden border border-[var(--carbon)]/35 bg-[var(--mist)]">
              <Image
                src="/images/events/science-odyssey/drive-02.webp"
                alt="Students compare marshmallow structures at the Science Odyssey activity table."
                fill
                sizes="(min-width: 1024px) 28vw, 100vw"
                className="object-cover"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--carbon)]/85 px-3 py-2 signal-mono text-[var(--off-white)]">MATERIALS / READY TO MOVE</figcaption>
            </figure>
          </div>

          <div className="min-w-0 border border-[var(--carbon)]/35 bg-[var(--off-white)] p-2 sm:p-3">
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

      <section className="bg-[var(--ultramarine)] text-[var(--off-white)]" aria-labelledby="finance-route-title">
        <div className="signal-shell grid gap-8 py-14 sm:py-[4.5rem] lg:grid-cols-[1fr_auto] lg:items-end lg:py-20">
          <div>
            <p className="signal-mono text-[var(--signal-orange)]">OPEN LEDGER / 03</p>
            <h2 id="finance-route-title" className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-[0.94] tracking-[-0.05em] sm:text-4xl">The work is public. The paper trail is too.</h2>
            <p className="mt-4 max-w-2xl font-body text-sm leading-6 text-[var(--off-white)]/75">View Hack Club&apos;s transparent finances for the current record. Payment details stay with the processor.</p>
          </div>
          <a href={ledgerUrl} target="_blank" rel="noopener noreferrer" className="signal-button signal-button--light">
            View transparent finances
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </section>
    </main>
  )
}
