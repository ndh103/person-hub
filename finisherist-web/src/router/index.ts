import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

import homeRoutes from "../views/home/route";
import aboutRoutes from '@/views/about/route';
import authRoutes from '@/auth/route';

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  ...authRoutes,
  ...homeRoutes,
  ...aboutRoutes
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
