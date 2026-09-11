/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        display: ['"Syne"', '"PingFang SC"', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#07080c',
          900: '#0c0e14',
          800: '#141822',
          700: '#1c2230',
        },
        mist: {
          100: '#f2f4f8',
          300: '#a8b0c0',
          500: '#6b7385',
        },
        bloom: {
          from: '#7c5cff',
          to: '#5b8cff',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)',
        orb: '0 4px 20px rgba(124, 92, 255, 0.45)',
      },
    },
  },
  plugins: [],
}
