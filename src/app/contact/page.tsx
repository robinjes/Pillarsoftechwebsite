import { Suspense } from 'react'
import Contact from '@/components/Contact'

export default function ContactPage() {
  return (
    <main className="min-h-screen overflow-x-hidden pt-16">
      <Suspense fallback={<div className="bg-[var(--cream)] px-5 py-24 text-center font-body text-[var(--ink)] sm:px-8">Loading contact form…</div>}>
        <Contact />
      </Suspense>
    </main>
  )
}
