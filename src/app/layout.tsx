import type { Metadata } from 'next'
import { Inter, Fredoka, Space_Grotesk, Quicksand } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })
const quicksand = Quicksand({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pillars of Tech',
  description: 'Enabling the next generation of tech leaders',
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Pillars of Tech',
    description: 'Enabling the next generation of tech leaders',
    images: [
      {
        url: '/PillarsOfTechLogo.png',
        width: 1200,
        height: 630,
        alt: 'Pillars of Tech Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pillars of Tech',
    description: 'Enabling the next generation of tech leaders',
    images: ['/PillarsOfTechLogo.png'],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={quicksand.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
} 