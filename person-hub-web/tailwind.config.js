module.exports = {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {
      opacity: ['disabled'],
      cursor: ['disabled', 'hover'],
      visibility: ['hover', 'focus'],
      backgroundColor: ['active'],
      borderWidth: ['hover', 'focus'],
    },
  },
  plugins: [],
}
