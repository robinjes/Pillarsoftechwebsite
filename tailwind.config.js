/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#DED5C7',
        ink: '#17334D',
        midnight: '#0D2B4A',
        sky: '#B9DDEC',
        cobalt: '#1C4B78',
        warm: '#FFFDF8',
        paper: '#F7F3EB',
        oat: '#DED5C7',
        coral: '#E9A98F',
        green: '#AAC6A5',
        sun: '#F7CA55',
        primary: '#0D2B4A',
        secondary: '#1C4B78',
        accent: '#B9DDEC',
        dark: '#0D2B4A',
        light: '#DED5C7',
        blue: {
          100: '#FFFDF8',
          200: '#F7F3EB',
          300: '#B9DDEC',
          400: '#1C4B78',
          500: '#1C4B78',
          600: '#0D2B4A',
          700: '#0D2B4A',
          800: '#09213A',
          850: '#071A2D',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Arial', 'sans-serif'],
        body: ['var(--font-body)', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
