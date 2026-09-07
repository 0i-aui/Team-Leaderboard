/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  // Note: the type stack lives on `body` in src/index.css; no theme
  // extensions are needed — keep this file minimal on purpose.
  theme: {
    extend: {},
  },
  plugins: [],
};
