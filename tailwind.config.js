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
        cream: '#EEE9DC',
        ink: '#111310',
        midnight: '#111310',
        sky: '#C7CED3',
        cobalt: '#183BFF',
        warm: '#F8F6EF',
        primary: '#111310',
        secondary: '#183BFF',
        accent: '#FF5B35',
        dark: '#111310',
        light: '#EEE9DC',
        blue: {
          100: '#F8F6EF',
          200: '#EEE9DC',
          300: '#C7CED3',
          400: '#183BFF',
          500: '#183BFF',
          600: '#111310',
          700: '#111310',
          800: '#0C0E0C',
          850: '#080A08',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Arial', 'sans-serif'],
        body: ['var(--font-body)', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
