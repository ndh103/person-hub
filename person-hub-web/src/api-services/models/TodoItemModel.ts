import TodoItemStatusEnum from './TodoItemStatusEnum'
import TodoItemTypeEnum from './TodoItemTypeEnum'

class TodoItemModel {
  id!: number
  userId!: string
  title!: string
  description!: string
  status!: TodoItemStatusEnum
  type!: TodoItemTypeEnum
  createdDate: Date
  itemOrder!: string
}

export default TodoItemModel
