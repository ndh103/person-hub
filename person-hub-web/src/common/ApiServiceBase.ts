import appStoreService from '@/store/application/applicationStoreService'
import { createToast } from 'mosha-vue-toastify'

class ApiServiceBase {
  makeApiCall = async (
    // eslint-disable-next-line @typescript-eslint/ban-types
    promiseFunc: Function,
    shouldShowLoading
  ): Promise<any> => {
    if (shouldShowLoading) {
      appStoreService.toggleLoading(true)
    }

    // calling function and return value
    // null if any error
    const response = await (promiseFunc() as Promise<unknown>).catch(() => {
      createToast(
        {
          title: '',
          description: 'There was an error!',
        },
        {
          timeout: 2000,
          type: 'danger',
          position: 'bottom-right',
          transition: 'slide',
          hideProgressBar: true,
          showIcon: true,
        }
      )
      return null
    })

    if (shouldShowLoading) {
      appStoreService.toggleLoading(false)
    }

    return response
  }
}

export default new ApiServiceBase()
