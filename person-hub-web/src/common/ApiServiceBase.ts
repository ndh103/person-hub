import appStoreService from '@/store/application/applicationStoreService'

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
    const response = await (promiseFunc() as Promise<any>).catch(() => null)

    if (shouldShowLoading) {
      appStoreService.toggleLoading(false)
    }

    return response
  }
}

export default new ApiServiceBase()
