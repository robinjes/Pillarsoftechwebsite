import type { Metadata } from 'next'

import JudgingApp from '@/components/judging/JudgingApp'

// Unlisted on purpose, like /qna and /feedback: judges reach it by QR code or
// typed URL and sign in with a personal code. Not linked from navigation, not
// in the sitemap, marked noindex, and deliberately absent from robots.txt.
export const metadata: Metadata = {
  title: 'Judging | Pillars of Tech',
  description: 'Score student pitches.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: null,
  twitter: null,
}

export default function JudgingPage() {
  return <JudgingApp />
}
