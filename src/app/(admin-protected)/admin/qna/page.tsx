import type { Metadata } from 'next'

import EventToolsTabs from '@/components/admin/EventToolsTabs'
import QnaHost from '@/components/qna/QnaHost'

export const metadata: Metadata = {
  title: 'Live Q&A | Admin',
  robots: { index: false, follow: false },
}

export default function AdminQnaPage() {
  return (
    <>
      <EventToolsTabs />
      <QnaHost />
    </>
  )
}
