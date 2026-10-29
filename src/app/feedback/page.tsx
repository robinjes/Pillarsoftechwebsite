import type { Metadata } from 'next'

import FeedbackForm from '@/components/feedback/FeedbackForm'

// Unlisted on purpose, like /qna: reached only by QR code or typed URL. Not
// linked from navigation, not in the sitemap, and marked noindex. It is also
// deliberately absent from robots.txt, which is public.
export const metadata: Metadata = {
  title: 'Event Feedback | Pillars of Tech',
  description: 'Tell us how the event went.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: null,
  twitter: null,
}

export default function FeedbackPage() {
  return <FeedbackForm />
}
