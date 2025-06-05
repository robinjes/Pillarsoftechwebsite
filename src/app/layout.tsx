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