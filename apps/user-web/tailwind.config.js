/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // WhatsApp emerald green
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b'
        },
        whatsapp: {
          green: '#25D366',
          dark: '#075E54',
          teal: '#128C7E',
          light: '#DCF8C6',
          bg: '#EFEAE2'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
};
