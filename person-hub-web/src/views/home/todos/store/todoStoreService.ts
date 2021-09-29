import TodoItemModel from '@/api-services/models/TodoItemModel'
import store from '@/store/index'
import { TodoModuleStoreState, todoStore } from './todo-store'

const state = store.state['todos'] as TodoModuleStoreState

class TodoStoreService {
  updateTodoItems(todoItems: Array<TodoItemModel>) {
    store.commit(`todos/${todoStore.mutations.updateTodoItems.name}`, todoItems)
  }

  state = state
}

export default new TodoStoreService()
