import TodoItemModel from '@/views/home/todos/api-services/models/TodoItemModel'

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
    updateTodoItems(state: TodoModuleStoreState, todoItems: Array<TodoItemModel>): void {
      state.todoItems = [...todoItems]
      state.todoItemsUpdatedTime = new Date()
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
