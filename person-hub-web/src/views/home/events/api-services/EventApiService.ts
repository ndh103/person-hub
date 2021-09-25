import http from '@/common/http-base'
import { AxiosResponse } from 'axios'
import EventModel from './models/EventModel'
import EventQueryModel from './models/EventQueryModel'

class EventApiService {
  add(event: EventModel): Promise<AxiosResponse<unknown>> {
    return http.post('life-events/events', event)
  }

  get(id: number): Promise<AxiosResponse<unknown>> {
    return http.get(`life-events/events/${id}`)
  }

  query(queryModel: EventQueryModel): Promise<AxiosResponse<unknown>> {
    return http.post(`life-events/events/query`, queryModel)
  }

  update(id: number, event: EventModel): Promise<AxiosResponse<unknown>> {
    return http.put(`life-events/events/${id}`, event)
  }

  delete(id: number): Promise<AxiosResponse<unknown>> {
    return http.delete(`life-events/events/${id}`)
  }
}

export default new EventApiService()
