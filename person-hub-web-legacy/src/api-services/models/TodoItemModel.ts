import TodoItemStatusEnum from './TodoItemStatusEnum';

class TodoItemModel {
    id!: number;
    userId!: string;
    title!: string;
    description!: string;
    status!: TodoItemStatusEnum;
    itemOrder!: string;
}

export default TodoItemModel;