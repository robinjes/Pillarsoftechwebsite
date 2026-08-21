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
        cream: '#F5F1E8',
        ink: '#0D1117',
        midnight: '#0A1B33',
        sky: '#B9DCF1',
        cobalt: '#2A65B7',
        warm: '#FFFDF8',
        primary: '#0A1B33',
        secondary: '#2A65B7',
        accent: '#B9DCF1',
        dark: '#0A1B33',
        light: '#F5F1E8',
        blue: {
          100: '#FFFDF8',
          200: '#F5F1E8',
          300: '#B9DCF1',
          400: '#2A65B7',
          500: '#2A65B7',
          600: '#0A1B33',
          700: '#0A1B33',
          800: '#07152A',
          850: '#050F20',
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
