import type { Metadata } from 'next'
import { connection } from 'next/server'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PublicAtmosphere from '@/components/site/PublicAtmosphere'
import { bodyFont, displayFont, monoFont } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Pillars of Tech | Give students the tools.',
  description: 'Pillars of Tech brings hands-on STEM learning to students, families, schools, and communities.',
  manifest: '/site.webmanifest',
  metadataBase: new URL('https://pillarsoftech.org'),
  openGraph: {
    title: 'Pillars of Tech | Give students the tools.',
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
    title: 'Pillars of Tech | Give students the tools.',
    description: 'Hands-on STEM learning for students, families, schools, and communities.',
    images: ['/potofficiallogo.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
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
      <body className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`} suppressHydrationWarning>
        <PublicAtmosphere />
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
