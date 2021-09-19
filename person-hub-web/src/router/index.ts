import { createWebHistory } from 'vue-router'

import homeRoutes from '../views/home/route'
import aboutRoutes from '@/views/about/route'

import { createRouter } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...homeRoutes, ...aboutRoutes],
})

export default router
