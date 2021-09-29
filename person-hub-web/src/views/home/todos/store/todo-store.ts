import TodoItemModel from '@/api-services/models/TodoItemModel'

export interface TodoModuleStoreState {
  todoItems: Array<TodoItemModel>
  todoItemsUpdatedTime: Date
}

export const todoStore = {
  namespaced: true,
  state(): TodoModuleStoreState {
    return {
      todoItems: new Array<TodoItemModel>(),
      todoItemsUpdatedTime: null,
    }
  },
  mutations: {
    updateTodoItems(
      state: TodoModuleStoreState,
      todoItems: Array<TodoItemModel>
    ): void {
      state.todoItems = [...todoItems]
      state.todoItemsUpdatedTime = new Date()
    },
  },
  actions: {},
}
