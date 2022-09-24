module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
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
