import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-[60vh] bg-[var(--cream)] px-5 py-20 text-[var(--ink)] sm:py-28">
      <div className="mx-auto max-w-3xl rounded-[2rem] bg-[var(--sky)] p-8 shadow-[0_18px_44px_rgba(23,51,77,0.12)] sm:p-12">
        <p className="eyebrow">404 / not found</p>
        <h1 className="family-heading text-5xl text-[var(--navy-950)] sm:text-6xl">That page took a wrong turn.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--ink)]/80">The page may have moved, or the event is not part of the public archive. Start with the current events or ask the team for help.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/events" className="button button--navy focus-ring">Browse events</Link>
          <Link href="/contact" className="button button--outline focus-ring">Contact the team</Link>
        </div>
      </div>
    </main>
  )
}
