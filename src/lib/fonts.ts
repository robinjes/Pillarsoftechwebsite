import { IBM_Plex_Sans, Instrument_Sans } from 'next/font/google'

export const displayFont = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
})

export const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
})
