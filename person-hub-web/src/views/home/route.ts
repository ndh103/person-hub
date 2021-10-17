import Home from './Home.vue'
import eventRoutes from './events/route/route'
import todoRoutes from './todos/route/route'
import finisherRoutes from './finisher-list/route/route'

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
      ...finisherRoutes,
    ],
  },
]

export default homeRoutes
