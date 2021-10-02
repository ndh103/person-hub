import http from '@/common/http-base'
import { AxiosResponse } from 'axios'
import EventModel from './models/EventModel'
import EventQueryModel from './models/EventQueryModel'
import ApiServiceBase from '@/common/ApiServiceBase'

class EventApiService {
  add(
    event: EventModel,
    shouldShowLoading = false
  ): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.post('life-events/events', event)
    }, shouldShowLoading)
  }

  get(id: number, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.get(`life-events/events/${id}`)
    }, shouldShowLoading)
  }

  query(
    queryModel: EventQueryModel,
    shouldShowLoading = false
  ): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.post(`life-events/events/query`, queryModel)
    }, shouldShowLoading)
  }

  update(
    id: number,
    event: EventModel,
    shouldShowLoading = false
  ): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.put(`life-events/events/${id}`, event)
    }, shouldShowLoading)
  }

  delete(
    id: number,
    shouldShowLoading = false
  ): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.delete(`life-events/events/${id}`)
    }, shouldShowLoading)
  }
}

export default new EventApiService()
