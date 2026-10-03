import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { seedDefaultData } from './db/seed';
import './style.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Seed before mounting so views never query an empty database on first visit
seedDefaultData()
  .catch(console.error)
  .finally(() => app.mount('#app'));
