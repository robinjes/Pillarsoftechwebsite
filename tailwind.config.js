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
        primary: '#15307a',    // Darker navy blue
        secondary: '#1e40af',   // Darker bright blue
        accent: '#2563eb',     // Kept the same light blue for contrast
        dark: '#0f1f4d',       // Darker blue
        light: '#f8fafc',      // Kept the same off white
        blue: {
          100: '#f8fafc',      // Kept the same off white
          200: '#e2e8f0',      // Kept the same light gray blue
          300: '#93c5fd',      // Kept the same sky blue
          400: '#2563eb',      // Kept the same light blue
          500: '#1e40af',      // Darker bright blue
          600: '#15307a',      // Darker navy blue
          700: '#0f1f4d',      // Darker blue
          800: '#0a1428',      // Darker near black blue
          850: '#081020',      // Darker button background
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 