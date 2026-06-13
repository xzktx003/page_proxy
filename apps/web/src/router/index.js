import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Embed from '../views/Embed.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/:slug', name: 'embed', component: Embed },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
