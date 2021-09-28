import Home from './Home.vue'
import eventRoutes from './events/route'
import todoRoutes from './todos/route'

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
        redirect: '/events',
      },
      ...todoRoutes,
      ...eventRoutes,
    ],
  },
]

export default homeRoutes
