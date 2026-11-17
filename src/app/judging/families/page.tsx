import type { Metadata } from 'next'
import JudgingAudience from '@/components/judging/JudgingAudience'

export const metadata: Metadata = {
  title: 'Event updates & results | Pillars of Tech',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer', openGraph: null, twitter: null,
}

export default function FamilyJudgingPage() { return <JudgingAudience /> }
