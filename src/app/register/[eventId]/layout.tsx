import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Participant registration | Pillars of Tech',
  description: 'Use the current participant registration form for a published Pillars of Tech event.',
}

export default function EventRegistrationLayout({ children }: { children: React.ReactNode }) {
  return children
}
