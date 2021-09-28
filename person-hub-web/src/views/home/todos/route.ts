import TodoItemList from './TodoItemList.vue'
import TodoItemDetail from './TodoItemDetail.vue'

const todoRoutes = [
  {
    path: '/todos',
    name: 'todos-view',
    component: TodoItemList,
    props: true,
  },
  {
    path: '/todos/:todoItemId',
    name: 'todos-view-detail',
    component: TodoItemDetail,
    props: true,
  },
]

export default todoRoutes
