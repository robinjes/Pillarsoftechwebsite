import type { Metadata } from 'next'

import EventToolsTabs from '@/components/admin/EventToolsTabs'
import FeedbackHost from '@/components/feedback/FeedbackHost'

export const metadata: Metadata = {
  title: 'Event Feedback | Admin',
  robots: { index: false, follow: false },
}

export default function AdminFeedbackPage() {
  return (
    <>
      <EventToolsTabs />
      <FeedbackHost />
    </>
  )
}
