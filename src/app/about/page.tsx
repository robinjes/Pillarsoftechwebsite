import type { Metadata } from 'next'
import About from '@/components/About'

export const metadata: Metadata = {
  title: 'About | Pillars of Tech',
  description: 'Learn how Pillars of Tech makes hands-on STEM learning more welcoming, useful, and transparent.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-x-hidden pt-16">
      <About />
    </main>
  )
}
