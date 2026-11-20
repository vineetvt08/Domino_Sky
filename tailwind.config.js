/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F8FA',
        card: '#FFFFFF',
        border: '#E4E8F0',
        ink: {
          DEFAULT: '#1F2A44',
          muted: '#6B778C',
          light: '#8F9CAE',
        },
        status: {
          ontime: '#2BB673',
          minor: '#F2A900',
          major: '#E5484D',
          cancelled: '#9AA3B2',
          closure: '#7C5CFC',
          recovered: '#14B8C4',
        },
        map: {
          land: '#E8EEF7',
          stroke: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
