/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // DnD dark gold theme
        'dnd-bg': '#0a0a0f',
        'dnd-panel': '#12121a',
        'dnd-border': '#2a2a3a',
        'dnd-gold': '#c8a84b',
        'dnd-gold-lt': '#dfc060',
        'dnd-text': '#e8e0d0',
        'dnd-muted': '#7a7895',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

