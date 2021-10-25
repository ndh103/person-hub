import TodoItemModel from '@/views/home/todos/api-services/models/TodoItemModel'
import store from '@/store/index'
import { TodoModuleStoreState, todoStore } from './todo-store'

const state = store.state['todos'] as TodoModuleStoreState

class TodoStoreService {
  updateTodoItems(todoItems: Array<TodoItemModel>) {
    store.commit(`todos/${todoStore.mutations.updateTodoItems.name}`, todoItems)
  }
  addTodoItem(todoItem: TodoItemModel) {
    store.commit(`todos/${todoStore.mutations.addTodoItem.name}`, todoItem)
  }

  removeTodoItem(todoItemId: number) {
    store.commit(`todos/${todoStore.mutations.removeTodoItem.name}`, todoItemId)
  }

  state = state
}

export default new TodoStoreService()
