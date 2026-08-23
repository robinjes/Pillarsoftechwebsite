import { Familjen_Grotesk, IBM_Plex_Sans } from 'next/font/google'

export const displayFont = Familjen_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

export const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
})
