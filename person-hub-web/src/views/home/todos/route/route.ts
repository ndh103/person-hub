import YourDayView from '../YourDayView.vue'
import TodoItemDetail from '../TodoItemDetail.vue'

const todoRoutes = [
  {
    path: '/yourday',
    name: 'yourday-view',
    component: YourDayView,
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
