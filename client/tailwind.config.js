/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['"Noto Kufi Arabic"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // القمح والسميد — هوية أسواق
        brand: {
          50: '#fdf8ed',
          100: '#faefd3',
          200: '#f4dca4',
          300: '#edc470',
          400: '#e5ac45',
          500: '#d9922a',
          600: '#bc741f',
          700: '#96571c',
          800: '#7a461d',
          900: '#65391b',
        },
        // أخضر للأفعال الإيجابية والحالة
        accent: {
          300: '#6bc4aa',
          400: '#3da98c',
          500: '#1f8a6d',
          600: '#146b54',
          700: '#0f5342',
        },
        surface: {
          light: '#fffdf8',
          DEFAULT: '#1c1a16',
          dark: '#131210',
          card: '#24211b',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,26,22,.05), 0 10px 30px -18px rgba(28,26,22,.35)',
      },
    },
  },
  plugins: [],
};
