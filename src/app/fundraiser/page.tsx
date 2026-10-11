import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUpRight, Heart, ShieldCheck } from 'lucide-react'

const donationUrl = 'https://hcb.hackclub.com/donations/start/pillars-of-tech'
const ledgerUrl = 'https://hcb.hackclub.com/pillars-of-tech/transactions'

export const metadata: Metadata = {
  title: 'Donate | Pillars of Tech',
  description: 'Help local kids build, explore, and discover STEM. Donate through HCB, with clear information about how checkout works.',
}

export default function FundraiserPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="bg-[var(--midnight)] text-[var(--paper)]" aria-labelledby="donate-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-7 px-5 py-9 sm:px-8 sm:py-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold text-[var(--sky)]">Thank you for being part of this</p>
            <h1 id="donate-heading" className="mt-3 max-w-lg font-display text-3xl leading-tight sm:text-4xl">Help a little curiosity grow.</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[var(--paper)]/85">
              Your support helps us bring hands-on science and engineering to kids and families. Together, we can make more room for learning, trying, and discovering.
            </p>
          </div>
          <div className="relative aspect-[2/1] overflow-hidden rounded-2xl">
            <Image
              src="/images/events/wildcat-tank/Outdoor2.JPG"
              alt="A student volunteer helps a younger participant at an outdoor foil-boat activity table."
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 420px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-9 sm:px-8 sm:py-12 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-12">
        <div className="order-2 space-y-7 lg:order-1">
          <section aria-labelledby="donation-payment-heading" className="rounded-2xl border border-[var(--ink)]/15 bg-white p-5">
            <ShieldCheck className="h-6 w-6 text-[var(--cobalt)]" aria-hidden="true" />
            <h2 id="donation-payment-heading" className="mt-3 font-display text-xl leading-tight text-[var(--midnight)]">Your payment stays with HCB.</h2>
            <p className="mt-3 text-sm leading-6"><strong>Pillars of Tech does not receive your card details.</strong></p>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]/80">All donation transactions go through HCB, Hack Club’s platform. Hack Club handles checkout and payment processing for us.</p>
            <Link href="/fundraiser/learn-more" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--cobalt)] underline underline-offset-4">
              Learn more about donating <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>

          <section aria-labelledby="donation-support-heading">
            <h2 id="donation-support-heading" className="flex items-center gap-2 font-display text-xl text-[var(--midnight)]"><Heart className="h-5 w-5" aria-hidden="true" /> More chances to try</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]/80">You’re helping us put materials, tools, and hands-on activities into students’ hands.</p>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]/80">Want to see what that looks like? <Link href="/events" className="font-semibold text-[var(--cobalt)] underline underline-offset-4">Explore our events.</Link></p>
            <a href={ledgerUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--cobalt)] underline underline-offset-4">
              View Transparent Finances <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </section>

          <p className="text-sm leading-6 text-[var(--ink)]/80">Have a question before giving? <Link href="/contact" className="font-semibold text-[var(--cobalt)] underline underline-offset-4">Talk with our team.</Link></p>
        </div>

        <section className="order-1 min-w-0 overflow-hidden rounded-2xl border border-[var(--ink)]/15 bg-white lg:order-2" aria-labelledby="donation-checkout-heading">
          <div className="border-b border-[var(--ink)]/15 p-5 sm:p-6">
            <h2 id="donation-checkout-heading" className="font-display text-2xl text-[var(--midnight)]">Make a donation</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink)]/75">This checkout is hosted by HCB. Choose the amount that feels right for you.</p>
            <p className="mt-3 text-sm leading-6 text-[var(--midnight)]">Pillars of Tech does not receive your card information. All transactions go through HCB.</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[var(--cobalt)]">
              <Link href="/fundraiser/learn-more" className="inline-flex min-h-11 items-center underline underline-offset-4">How donations work</Link>
              <a href={donationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">Open checkout on HCB <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
          </div>
          <iframe
            src={donationUrl}
            title="Donate to Pillars of Tech through HCB"
            className="h-[1100px] w-full border-0 sm:h-[1000px]"
            loading="eager"
            allow="payment"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <div className="border-t border-[var(--ink)]/15 p-5 sm:p-6">
            <p className="text-sm leading-6 text-[var(--ink)]/75">Prefer a separate tab, or having trouble with the form?</p>
            <a href={donationUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--midnight)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--cobalt)]">
              Open Secure Donation Page <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
