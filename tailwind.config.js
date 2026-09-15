/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {

      fontFamily: {
        sans:    ["'DM Sans'", 'sans-serif'],
        display: ["'Plus Jakarta Sans'", "'DM Sans'", 'sans-serif'],
      },

      colors: {
        primary: {
          DEFAULT: '#1B2E6B',
          dark:    '#111d47',
          light:   '#dce1f5',
        },
        brand: {
          red:    '#E31E24',
          navy:   '#1B2E6B',
          navyDark: '#111d47',
        },
        surface: {
          DEFAULT: '#F5F6FA',
          2:       '#F9FAFC',
          offset:  '#EEF0F7',
        },
        border: {
          DEFAULT: '#CDD0E0',
          subtle:  '#EEF0F7',
        },
        text: {
          primary:   '#1a1d2e',
          secondary: '#5c607a',
          muted:     '#9ea3ba',
          body:      '#8890b0',
        },
      },

      boxShadow: {
        card:  '0 1px 3px rgba(27,46,107,0.07)',
        navy:  '0 2px 8px rgba(27,46,107,0.25)',
        'navy-lg': '0 4px 12px rgba(27,46,107,0.35)',
        red:   '0 2px 8px rgba(227,30,36,0.25)',
      },

    },
  },
  plugins: [],
}