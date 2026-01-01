/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      minHeight: {
        '44': '44px', // Touch target minimum
      },
      minWidth: {
        '44': '44px', // Touch target minimum
      },
    },
  },
  plugins: [],
}
