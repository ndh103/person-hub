import dayjs from 'dayjs'

class VueAppFilters {
  formatDate(value, format) {
    if (!format) {
      format = 'DD MMM YYYY'
    }
    return dayjs(value).format(format)
  }
}

const VueAppFilterPlugin = {
  install: (app, options) => {
    app.config.globalProperties.$filters = new VueAppFilters()
  },
}

export default VueAppFilterPlugin
