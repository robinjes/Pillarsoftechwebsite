import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Event details | Pillars of Tech',
  description: 'See the confirmed schedule, location, registration state, help guidance, and approved media for a Pillars of Tech event.',
}

export default function EventDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
