import TodoItemModel from './models/TodoItemModel'
import http from '@/common/http-base'
import { AxiosResponse } from 'axios'
import ApiServiceBase from '@/common/ApiServiceBase'

class TodoItemApiService {
  add(todoItem: TodoItemModel, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.post('todos/items', todoItem)
    }, shouldShowLoading)
  }

  query(status: number, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.get(`todos/items/status/${status}`)
    }, shouldShowLoading)
  }

  get(id: string, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.get(`todos/items/${id}`)
    }, shouldShowLoading)
  }

  update(todoItem: TodoItemModel, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.put(`todos/items/${todoItem.id}`, todoItem)
    }, shouldShowLoading)
  }

  markAsDone(todoItemId: number, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.post(`todos/items/${todoItemId}/done`)
    }, shouldShowLoading)
  }

  delete(todoItem: TodoItemModel, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.delete(`challenges/${todoItem.id}`)
    }, shouldShowLoading)
  }
}

const todoItemApiService = new TodoItemApiService()

export default todoItemApiService
