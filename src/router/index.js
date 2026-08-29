import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'start',
      component: () => import('../views/StartPage.vue'),
    },
    {
      path: '/ui-demo',
      name: 'ui-demo',
      component: () => import('../views/UiDemoPage.vue'),
    },
    {
      path: '/projects/new',
      name: 'create-project',
      component: () => import('../views/CreateProjectPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
