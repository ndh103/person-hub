import { getAuthServiceInstance } from '@/auth/AuthServiceProvider'
import axios from 'axios'

const httpInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
})

// Add a request interceptor
httpInstance.interceptors.request.use(
  async function (request) {
    try {
      const authService = await getAuthServiceInstance()

      const token = await authService.getTokenSilently()

      if (token) {
        request.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.log(error)
    }

    // Do something before request is sent
    return request
  },
  function (error) {
    console.log(error)

    // Do something with request error
    return Promise.reject(error)
  }
)

// Add a response interceptor
httpInstance.interceptors.response.use(
  function (response) {
    // Do something with response data
    return response
  },
  function (error) {
    // Do something with response error
    return Promise.reject(error)
  }
)

export default httpInstance
