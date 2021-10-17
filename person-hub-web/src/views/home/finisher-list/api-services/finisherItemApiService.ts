import http from '@/common/http-base'
import { AxiosResponse } from 'axios'
import ApiServiceBase from '@/common/ApiServiceBase'
import FinisherItem from './models/FinisherItem'
import FinisherItemQuery from './models/FinisherItemQuery'
import FinisherItemLog from './models/FinisherItemLog'

const baseUrl = 'finisher/items'

class FinisherItemApiService {
  add(item: FinisherItem, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.post(baseUrl, item)
    }, shouldShowLoading)
  }

  get(id: number, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.get(`${baseUrl}/${id}`)
    }, shouldShowLoading)
  }

  query(query: FinisherItemQuery, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.post(`${baseUrl}/query`, query)
    }, shouldShowLoading)
  }

  update(id: number, item: FinisherItem, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.put(`${baseUrl}/${id}`, item)
    }, shouldShowLoading)
  }

  finish(
    itemId: number,
    finishActionRequest: {
      finishDate: Date
    },
    shouldShowLoading = false
  ): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.post(`${baseUrl}/${itemId}/finish`, finishActionRequest)
    }, shouldShowLoading)
  }

  delete(id: number, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.delete(`${baseUrl}/${id}`)
    }, shouldShowLoading)
  }

  // logs
  addLog(itemId: number, itemLog: FinisherItemLog, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.post(`${baseUrl}/${itemId}/logs}`, itemLog)
    }, shouldShowLoading)
  }

  updateLog(itemId: number, itemLogId: number, itemLog: FinisherItemLog, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.put(`${baseUrl}/${itemId}/logs/${itemLogId}`, itemLog)
    }, shouldShowLoading)
  }

  deleteLog(itemId: number, itemLogId: number, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.delete(`${baseUrl}/${itemId}/logs/${itemLogId}`)
    }, shouldShowLoading)
  }
}

export default new FinisherItemApiService()
