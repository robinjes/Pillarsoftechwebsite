import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Events | Pillars of Tech',
    template: '%s | Pillars of Tech',
  },
  description: 'Browse upcoming, ongoing, completed, and cancelled Pillars of Tech STEM programs.',
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children
}
