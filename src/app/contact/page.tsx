import { Suspense } from 'react'
import Contact from '@/components/Contact'

export default function ContactPage() {
  return (
    <main className="min-h-screen pt-16">
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-24 text-center text-blue-100 sm:px-6 lg:px-8">Loading contact form...</div>}>
        <Contact />
      </Suspense>
    </main>
  )
}
