import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Local judging demo', robots: { index: false, follow: false }, openGraph: null, twitter: null }

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  return children
}
