import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Generates the favicon, apple-touch-icon and manifest icons (incl. maskable) from the SVG,
      // and injects the matching <link> tags into index.html
      pwaAssets: {
        image: 'public/favicon.svg',
        preset: 'minimal-2023',
        overrideManifestIcons: true,
      },
      includeAssets: ['robots.txt'],
      manifest: {
        id: '/',
        name: 'Packing Checklist',
        short_name: 'Packing',
        description: 'Build a packing list for your trip and tick it off as you pack',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        categories: ['travel', 'productivity', 'utilities'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vue-vendor', test: /node_modules[\\/](@vue|vue|vue-router|pinia)[\\/]/ },
            { name: 'db-vendor', test: /node_modules[\\/]dexie[\\/]/ },
            { name: 'ui-vendor', test: /node_modules[\\/]@headlessui[\\/]/ },
            { name: 'date-vendor', test: /node_modules[\\/]date-fns[\\/]/ },
          ],
        },
      },
    },
    chunkSizeWarningLimit: 200, // Warn if chunk >200KB
  },
});
