import TodoItemModel from "./TodoItemModel"

class TodoTopicModel {
  id!: number
  userId!: string
  name!: string
  createdDate: Date
  order!: string
  todoItems: Array<TodoItemModel>
}

export default TodoTopicModel
