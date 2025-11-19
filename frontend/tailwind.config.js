/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0f7',
          100: '#b3d1e8',
          200: '#80b2d9',
          300: '#4d93ca',
          400: '#1a74bb',
          500: '#016ba3',
          600: '#014a7a',
          700: '#012c54',
          800: '#011e3a',
          900: '#001020',
        },
        accent: {
          50: '#fef5e7',
          100: '#fde8c4',
          200: '#fbd99e',
          300: '#f9ca78',
          400: '#f7bb52',
          500: '#f5a11a',
          600: '#c48115',
          700: '#936110',
          800: '#62410b',
          900: '#312106',
        }
      }
    },
  },
  plugins: [],
}

