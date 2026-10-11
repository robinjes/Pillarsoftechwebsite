import localFont from 'next/font/local'

export const displayFont = localFont({
  src: '../assets/fonts/fredoka/Fredoka[wdth,wght].ttf',
  display: 'swap',
  variable: '--font-display',
  weight: '300 700',
})

export const bodyFont = localFont({
  src: [
    { path: '../assets/fonts/atkinsonhyperlegible/AtkinsonHyperlegible-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../assets/fonts/atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  variable: '--font-body',
})

export const adminBodyFont = localFont({
  src: '../assets/fonts/spacegrotesk/SpaceGrotesk[wght].ttf',
  display: 'swap',
  weight: '300 700',
})
