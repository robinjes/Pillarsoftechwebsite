import type { Metadata } from 'next'
import { connection } from 'next/server'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { bodyFont, displayFont } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Pillars of Tech | STEM belongs in every student’s hands.',
  description: 'Pillars of Tech brings hands-on STEM learning to students, families, schools, and communities.',
  manifest: '/site.webmanifest',
  metadataBase: new URL('https://pillarsoftech.org'),
  openGraph: {
    title: 'Pillars of Tech | STEM belongs in every student’s hands.',
    description: 'Hands-on STEM learning for students, families, schools, and communities.',
    images: [
      {
        url: '/potofficiallogo.png',
        width: 1200,
        height: 630,
        alt: 'Pillars of Tech Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pillars of Tech | STEM belongs in every student’s hands.',
    description: 'Hands-on STEM learning for students, families, schools, and communities.',
    images: ['/potofficiallogo.png'],
  },
  icons: {
    icon: [
      { url: '/logonotext.png', sizes: 'any' },
      { url: '/logonotext.png', sizes: '16x16', type: 'image/png' },
      { url: '/logonotext.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/logonotext.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/logonotext.png', sizes: '192x192', type: 'image/png' },
      { url: '/logonotext.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await connection()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable}`} suppressHydrationWarning>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Navbar />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  )
} 
