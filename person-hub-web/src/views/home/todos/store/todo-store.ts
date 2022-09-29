import TodoItemModel from '@/views/home/todos/api-services/models/TodoItemModel'
import TodoTopicModel from '../api-services/models/TodoTopicModel'

export interface TodoModuleStoreState {
  topics: Array<TodoTopicModel>
  todoItems: Array<TodoItemModel>
  todoItemsUpdatedTime: Date
}

export const todoStore = {
  namespaced: true,
  state(): TodoModuleStoreState {
    return {
      topics: new Array<TodoTopicModel>(),
      todoItems: new Array<TodoItemModel>(),
      todoItemsUpdatedTime: null,
    }
  },
  mutations: {
    updateTopics(state: TodoModuleStoreState, topics: Array<TodoTopicModel>): void {
      state.topics = [...topics]
    },
    addTopic(state: TodoModuleStoreState, topic: TodoTopicModel): void {
      state.topics.unshift({ ...topic })
    },
    removeTopic(state: TodoModuleStoreState, topicId: number): void {
      state.topics = state.topics.filter((r) => r.id != topicId)
    },
    updateTodoItems(state: TodoModuleStoreState, todoItems: Array<TodoItemModel>): void {
      state.todoItems = [...todoItems]
      state.todoItemsUpdatedTime = new Date()
    },
    reorderTodoItem(state: TodoModuleStoreState, todoItem: TodoItemModel): void {
      // remove old item
      // add new items, --> that will trigger the list changes
      state.todoItems = state.todoItems.filter((r) => r.id != todoItem.id)
      state.todoItems.push({ ...todoItem })
    },
    addTodoItem(state: TodoModuleStoreState, todoItem: TodoItemModel): void {
      state.todoItems.push({ ...todoItem })
    },
    removeTodoItem(state: TodoModuleStoreState, todoItemId: number): void {
      state.todoItems = state.todoItems.filter((r) => r.id != todoItemId)
    },
  },
  actions: {},
}
