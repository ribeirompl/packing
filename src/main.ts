import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { seedDefaultData } from './db/seed';
import './style.css';

// Initialize database with seed data
seedDefaultData().catch(console.error);

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
