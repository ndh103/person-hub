import { getAuthServiceInstance } from '@/auth/AuthServiceProvider';
import axios from 'axios'

const httpInstance = axios.create({
  baseURL: process.env.VUE_APP_API_URL
});

// Add a request interceptor
httpInstance.interceptors.request.use(async function (request) {
  const authService = await getAuthServiceInstance();

  const token = await authService.getTokenSilently();

  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }

  // Do something before request is sent
  return request;
}, function (error) {
  // Do something with request error
  return Promise.reject(error);
});

// Add a response interceptor
httpInstance.interceptors.response.use(function (response) {
  // Do something with response data
  return response;
}, function (error) {
  // Do something with response error
  return Promise.reject(error);
});

export default httpInstance;