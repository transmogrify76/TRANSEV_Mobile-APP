/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Company core color (#7dab49) as a full Tailwind-style scale.
        brand: {
          50: '#f4f8ee',
          100: '#e6f0d9',
          200: '#cde1b3',
          300: '#b0d084',
          400: '#94bf5c',
          500: '#7dab49',
          600: '#63893a',
          700: '#4d6b2d',
          800: '#3c5424',
          900: '#30431d',
          950: '#1a2510',
        },
        ink: {
          50: '#f7f8f7',
          100: '#eef0ee',
          200: '#d7dcd6',
          300: '#a9b3a7',
          400: '#71806f',
          500: '#4c5a4a',
          600: '#3a4638',
          700: '#2c352a',
          800: '#1f261e',
          900: '#141813',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 10px 0 rgba(30, 41, 26, 0.06)',
        card: '0 8px 24px -4px rgba(30, 41, 26, 0.12)',
        glow: '0 8px 30px -6px rgba(125, 171, 73, 0.45)',
      },
      borderRadius: {
        '2.5xl': '1.375rem',
      },
      transitionProperty: {
        width: 'width',
        spacing: 'margin, padding',
      },
    },
  },
  plugins: [],
};
