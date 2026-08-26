import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Participant Registration | Pillars of Tech',
  description: 'Register for a published Pillars of Tech event using its current participant form.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
