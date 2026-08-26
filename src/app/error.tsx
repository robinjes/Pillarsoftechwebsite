'use client'

import Link from 'next/link'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[60vh] bg-[var(--cream)] px-5 py-20 text-[var(--ink)] sm:py-28">
      <div className="mx-auto max-w-3xl rounded-[2rem] bg-[var(--coral)] p-8 shadow-[0_18px_44px_rgba(23,51,77,0.12)] sm:p-12">
        <p className="eyebrow">A temporary pause</p>
        <h1 className="family-heading text-5xl text-[var(--navy-950)] sm:text-6xl">Something went wrong.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--ink)]/80">We could not finish loading this page. Try again, or contact the team if you still need help.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => reset()} className="button button--navy focus-ring">Try again</button>
          <Link href="/contact" className="button button--outline focus-ring">Contact the team</Link>
        </div>
      </div>
    </main>
  )
}
