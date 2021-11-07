import dayjs from 'dayjs'

class VueAppFilters {
  formatDate(value, format) {
    if (!format) {
      format = 'DD MMM YYYY'
    }
    return dayjs(value).format(format)
  }

  toMonthName(monthNumber) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return monthNames[monthNumber]
  }
}

const VueAppFilterPlugin = {
  install: (app, options) => {
    app.config.globalProperties.$filters = new VueAppFilters()
  },
}

export default VueAppFilterPlugin
