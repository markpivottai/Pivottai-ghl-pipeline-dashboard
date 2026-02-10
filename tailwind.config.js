/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pivott: {
          dark: '#021526',
          navy: '#03346E',
          blue: '#6EACDA',
          sand: '#E2E2B6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
