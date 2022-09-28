import TodoListView from '../TodoListView.vue'
import TodoItemDetail from '../TodoItemDetail.vue'

const todoRoutes = [
  {
    path: '/todos',
    name: 'todo-list-view',
    component: TodoListView,
    props: true,
  },
  {
    path: '/todos/:todoItemId',
    name: 'todos-item-detail',
    component: TodoItemDetail,
    props: true,
  },
]

export default todoRoutes
