import type { Metadata } from 'next'
import JudgingOverlay from '@/components/judging/JudgingOverlay'
import './overlay.css'

export const metadata: Metadata = {
  title: 'Judging broadcast | Pillars of Tech',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
  openGraph: null,
  twitter: null,
}

export default function JudgingOverlayPage() {
  return <JudgingOverlay />
}
