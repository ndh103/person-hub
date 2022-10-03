import TodoItemModel from '@/views/home/todos/api-services/models/TodoItemModel'
import store from '@/store/index'
import { TodoModuleStoreState, todoStore } from './todo-store'
import TodoTopicModel from '../api-services/models/TodoTopicModel'

class TodoStoreService {
  updateTopics(topics: Array<TodoTopicModel>) {
    store.commit(`todos/${todoStore.mutations.updateTopics.name}`, topics)
  }
  addTopic(topic: TodoTopicModel) {
    store.commit(`todos/${todoStore.mutations.addTopic.name}`, topic)
  }
  removeTopic(topicId: number) {
    store.commit(`todos/${todoStore.mutations.removeTopic.name}`, topicId)
  }
  reorderTopic(topic: TodoTopicModel) {
    store.commit(`todos/${todoStore.mutations.reorderTopic.name}`, topic)
  }
  updateTodoItems(todoItems: Array<TodoItemModel>) {
    store.commit(`todos/${todoStore.mutations.updateTodoItems.name}`, todoItems)
  }
  reorderTodoItem(todoItem: TodoItemModel) {
    store.commit(`todos/${todoStore.mutations.reorderTodoItem.name}`, todoItem)
  }
  addTodoItem(todoItem: TodoItemModel) {
    store.commit(`todos/${todoStore.mutations.addTodoItem.name}`, todoItem)
  }
  removeTodoItem(todoItemId: number) {
    store.commit(`todos/${todoStore.mutations.removeTodoItem.name}`, todoItemId)
  }

  state = store.state['todos'] as TodoModuleStoreState
}

const instance = new TodoStoreService()

export default instance
