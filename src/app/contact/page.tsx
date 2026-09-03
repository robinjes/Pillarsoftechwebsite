import { Suspense } from 'react'
import type { Metadata } from 'next'
import Contact from '@/components/Contact'

export const metadata: Metadata = {
  title: 'Contact | Pillars of Tech',
  description: 'Ask a question, plan a workshop, volunteer, or coordinate equipment with Pillars of Tech.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <Suspense fallback={<div className="bg-[var(--cream)] px-5 py-24 text-center font-body text-[var(--ink)] sm:px-8">Loading contact form…</div>}>
        <Contact />
      </Suspense>
    </main>
  )
}
