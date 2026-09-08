import type { Metadata } from 'next'
import Contact from '@/components/Contact'

export const metadata: Metadata = {
  title: 'Contact | Pillars of Tech',
  description: 'Ask a question, plan a workshop, volunteer, or coordinate equipment with Pillars of Tech.',
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ reason?: string | string[] }> }) {
  const { reason } = await searchParams
  const initialReason = typeof reason === 'string' ? reason : undefined

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Contact initialReason={initialReason} />
    </main>
  )
}
