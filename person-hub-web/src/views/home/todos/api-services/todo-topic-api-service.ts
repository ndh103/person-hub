import TodoItemModel from './models/TodoItemModel'
import http from '@/common/http-base'
import { AxiosResponse } from 'axios'
import ApiServiceBase from '@/common/ApiServiceBase'
import TodoTopicModel from './models/TodoTopicModel'

class TodoTopicApiService {
  add(todoTopic: TodoTopicModel, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.post('todos/topics', todoTopic)
    }, shouldShowLoading)
  }

  getAll(shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.get(`todos/topics`)
    }, shouldShowLoading)
  }

  getTodoItems(topicId: number, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.get(`todos/topics/${topicId}/items`)
    }, shouldShowLoading)
  }

  get(id: string, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.get(`todos/topics/${id}`)
    }, shouldShowLoading)
  }

  update(todoTopic: TodoTopicModel, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.put(`todos/topics/${todoTopic.id}`, todoTopic)
    }, shouldShowLoading)
  }

  delete(todoItem: TodoItemModel, shouldShowLoading = false): Promise<AxiosResponse<unknown>> {
    return ApiServiceBase.makeApiCall(async () => {
      return http.delete(`challenges/${todoItem.id}`)
    }, shouldShowLoading)
  }
}

const todoItemApiService = new TodoTopicApiService()

export default todoItemApiService
