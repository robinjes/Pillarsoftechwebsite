import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Volunteer | Pillars of Tech',
  description: 'Find current volunteer opportunities and manage your Pillars of Tech volunteer account.',
}

export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  return children
}
