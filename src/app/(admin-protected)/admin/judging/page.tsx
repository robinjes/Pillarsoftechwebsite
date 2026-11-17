import type { Metadata } from 'next'

import EventToolsTabs from '@/components/admin/EventToolsTabs'
import JudgingHost from '@/components/judging/JudgingHost'

export const metadata: Metadata = {
  title: 'Pitch Judging | Admin',
  robots: { index: false, follow: false },
}

export default function AdminJudgingPage() {
  return (
    <>
      <EventToolsTabs />
      <JudgingHost />
    </>
  )
}
