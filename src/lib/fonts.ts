import { Atkinson_Hyperlegible, Fredoka } from 'next/font/google'

export const displayFont = Fredoka({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['500', '600', '700'],
})

export const bodyFont = Atkinson_Hyperlegible({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-body',
  weight: ['400', '700'],
})
