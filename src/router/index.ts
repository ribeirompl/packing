import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'questionnaire',
      component: () => import('@/views/QuestionnaireView.vue'),
    },
    {
      path: '/checklist',
      name: 'checklist',
      component: () => import('@/views/ChecklistView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
});

export default router;
