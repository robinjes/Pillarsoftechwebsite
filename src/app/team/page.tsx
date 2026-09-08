import type { Metadata } from 'next'
import Team from '@/components/Team'

export const metadata: Metadata = {
  title: 'Team | Pillars of Tech',
  description: 'Meet the students and team members who make hands-on STEM learning possible at Pillars of Tech.',
}

export default function TeamPage() {
  return (
    <main className="min-h-screen overflow-x-hidden pt-16">
      <Team />
    </main>
  )
}
