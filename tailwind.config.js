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
        cream: '#F3EBDD',
        ink: '#101114',
        midnight: '#0B1F3A',
        sky: '#A9D8F2',
        cobalt: '#2B5DA8',
        warm: '#FFFDF8',
        primary: '#0B1F3A',
        secondary: '#2B5DA8',
        accent: '#A9D8F2',
        dark: '#0B1F3A',
        light: '#F3EBDD',
        blue: {
          100: '#FFFDF8',
          200: '#F3EBDD',
          300: '#A9D8F2',
          400: '#2B5DA8',
          500: '#2B5DA8',
          600: '#0B1F3A',
          700: '#0B1F3A',
          800: '#07152A',
          850: '#061226',
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
