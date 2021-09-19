const colors = require("tailwindcss/colors")

module.exports = {
  purge: ["./src/**/*.html", "./src/**/*.vue", "./src/**/*.jsx"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
    colors: {
      ...colors,
    },
  },
  variants: {
    extend: {
      opacity: ["disabled"],
      cursor: ["disabled"],
      visibility: ['hover', 'focus'],
    },
  },
  experiments: {
    shadowLookup: true,
  },
  plugins: [require("@tailwindcss/forms")],
}
