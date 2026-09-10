/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#7892b8',
          500: '#5e7da0',
          600: '#486581',
          700: '#3a5a7a',
          800: '#1e3a5f',
          900: '#0f2742',
        },
      },
    },
  },
  plugins: [],
};
