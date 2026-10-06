/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        // خط اللوجو (Alexandria) للعناوين — هوية ٦ أكتوبر
        display: ['Alexandria', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // أزرق أسواق الهلال (هوية ٦ أكتوبر) — 500 للزراير، 600 لون اللوجو
        brand: {
          50: '#eff4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#6090fa',
          500: '#2f62ee',
          600: '#1f4fd8',
          700: '#1c3fb0',
          800: '#1d368c',
          900: '#1c2f6e',
        },
        // أخضر للأفعال الإيجابية والحالة
        accent: {
          50: '#ecfdf3',
          300: '#6ce9a6',
          400: '#32d583',
          500: '#12b76a',
          600: '#039855',
          700: '#027a48',
        },
        surface: {
          // الشريط اللي فوق واللي تحت
          light: '#ffffff',
          // خلفية الصفحة — رمادي فاتح عشان الكروت البيضا تبان
          page: '#f5f6f8',
          DEFAULT: '#16181d',
          dark: '#0e1013',
          card: '#1b1e24',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.05), 0 8px 24px -16px rgba(16,24,40,.25)',
      },
    },
  },
  plugins: [],
};
