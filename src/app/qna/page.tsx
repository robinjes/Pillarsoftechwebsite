import type { Metadata } from 'next'

import QnaAudience from '@/components/qna/QnaAudience'

// Unlisted on purpose: this page is reached only by QR code or typed URL. It
// is not linked from navigation, not in the sitemap, and asks search engines
// not to index it. It is deliberately absent from robots.txt, which is public
// and would advertise the path.
export const metadata: Metadata = {
  title: 'Live Q&A | Pillars of Tech',
  description: 'Ask the panel a question and upvote the ones you want answered.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: null,
  twitter: null,
}

export default function QnaPage() {
  return <QnaAudience />
}
