import TodoItemStatusEnum from './TodoItemStatusEnum';

class TodoItemModel {
    id!: number;
    userId!: string;
    title!: string;
    description!: string;
    status!: TodoItemStatusEnum;
}

export default TodoItemModel;