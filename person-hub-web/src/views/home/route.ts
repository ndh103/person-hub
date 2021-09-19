import Home from './Home.vue'
import TodoItemList from './todos/TodoItemList.vue'
import TodoItemDetail from './todos/TodoItemDetail.vue'
import EventList from './events/EventList.vue'

const homeRoutes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        redirect: '/todos',
      },
      // Todos Path
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
      // EVENT PATH
      {
        path: '/events',
        name: 'events-view',
        component: EventList,
        props: true,
      },
    ],
  },
]

export default homeRoutes
