import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'How Donations Work | Pillars of Tech',
  description: 'Learn how HCB handles Pillars of Tech donations, protects payment details, and provides receipts and transparent finances.',
}

export default function DonationInformationPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="bg-[var(--midnight)] text-[var(--paper)]">
        <div className="mx-auto max-w-3xl px-5 py-9 sm:px-8 sm:py-12">
          <Link href="/fundraiser" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--sky)] underline-offset-4 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to donate</Link>
          <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">A little more about giving.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--paper)]/85">You deserve to know where your gift goes and who handles your payment. Here’s how it works.</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-9 px-5 py-9 sm:px-8 sm:py-12">
        <section aria-labelledby="giving-support-heading">
          <h2 id="giving-support-heading" className="font-display text-2xl text-[var(--midnight)]">What your gift supports</h2>
          <p className="mt-3 text-base leading-7">Pillars of Tech brings hands-on STEM activities to kids and families. Donations support the materials, tools, and events that help students build, experiment, and explore.</p>
          <Link href="/events" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--cobalt)] underline underline-offset-4">See our events <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>

        <section aria-labelledby="giving-payment-heading" className="rounded-2xl border border-[var(--ink)]/15 bg-white p-5 sm:p-6">
          <h2 id="giving-payment-heading" className="font-display text-2xl text-[var(--midnight)]">HCB handles the payment</h2>
          <p className="mt-3 text-base leading-7">Pillars of Tech is fiscally sponsored through Hack Club. All donation transactions go through HCB, Hack Club’s platform, which uses Stripe for payment processing.</p>
          <p className="mt-4 text-base leading-7"><strong>Pillars of Tech does not receive your card number, security code, or payment credentials.</strong> You enter payment details in HCB’s checkout, including when that checkout is embedded on our donate page.</p>
          <p className="mt-4 text-base leading-7">Opening the donate page loads content from HCB. HCB and its payment providers handle information you enter there according to their policies.</p>
          <a href="https://hackclub.com/hcb" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--cobalt)] underline underline-offset-4">Meet HCB <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
        </section>

        <section aria-labelledby="giving-steps-heading">
          <h2 id="giving-steps-heading" className="font-display text-2xl text-[var(--midnight)]">What to expect</h2>
          <ol className="mt-5 space-y-4">
            {[
              ['Choose your gift', 'Select an amount in the HCB checkout. Review the options and total before continuing.'],
              ['Complete checkout with HCB', 'Follow the steps in HCB’s form to enter your details and confirm your donation.'],
              ['Look for your receipt', 'After a successful donation, HCB automatically emails you a receipt.'],
            ].map(([title, text], index) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sky)] text-sm font-bold text-[var(--midnight)]" aria-hidden="true">{index + 1}</span>
                <div><h3 className="font-semibold text-[var(--midnight)]">{title}</h3><p className="mt-1 text-base leading-7 text-[var(--ink)]/80">{text}</p></div>
              </li>
            ))}
          </ol>
          <a href="https://help.hcb.hackclub.com/en/articles/15410030-how-do-donation-receipts-and-refunds-work" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--cobalt)] underline underline-offset-4">HCB’s guide to receipts and refunds <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
        </section>

        <section aria-labelledby="giving-finances-heading" className="border-t border-[var(--ink)]/20 pt-8">
          <h2 id="giving-finances-heading" className="font-display text-2xl text-[var(--midnight)]">You can follow the finances</h2>
          <p className="mt-3 text-base leading-7">Our public HCB transaction record shows how funds come in and how they’re used.</p>
          <a href="https://hcb.hackclub.com/pillars-of-tech/transactions" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--cobalt)] underline underline-offset-4">View our transaction record <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
        </section>

        <div className="flex flex-wrap items-center gap-5 border-t border-[var(--ink)]/20 pt-8">
          <Link href="/fundraiser" className="inline-flex min-h-11 items-center rounded-full bg-[var(--midnight)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--cobalt)]">Return to donate</Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center font-semibold text-[var(--cobalt)] underline underline-offset-4">Have a question? Talk with us.</Link>
        </div>
      </div>
    </main>
  )
}
