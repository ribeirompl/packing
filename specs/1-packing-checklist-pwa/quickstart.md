# Quickstart: Packing Checklist PWA

**Date**: 2025-12-28
**Feature**: Packing Checklist PWA
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Overview

This quickstart guide covers setup, development, testing, building, and deploying the Packing Checklist PWA. The app is built with Vue 3, TypeScript, Dexie.js (IndexedDB), and Vite PWA Plugin for offline-first functionality.

---

## Prerequisites

- **Node.js**: 20.x or later (LTS recommended)
- **npm**: 10.x or later (included with Node.js)
- **Git**: For version control
- **Modern browser**: Chrome 90+, Edge 90+, Firefox latest, or Safari 15+ for testing PWA features
- **HTTPS server**: Required for production PWA installability (localhost exempt for development)

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/packing.git
cd packing
```

### 2. Checkout Feature Branch

```bash
git checkout 1-packing-checklist-pwa
```

### 3. Install Dependencies

```bash
npm install
```

This installs all dependencies defined in `package.json`:
- **Vue 3.5+**: Core framework (Composition API)
- **Dexie.js 4.x**: IndexedDB wrapper with TypeScript support
- **Vite 7.x**: Build tool and dev server
- **Vite PWA Plugin 1.x**: Service Worker generation with Workbox
- **Pinia 3.x**: State management
- **Vue Router 4.6+**: Client-side routing (hash mode)
- **date-fns 4.x**: Date calculations
- **Tailwind CSS 4.x**: Utility-first styling
- **Headless UI 1.7+**: Accessible component primitives
- **Vitest 4.x**: Unit/integration testing
- **Playwright 1.57+**: E2E testing with offline scenarios

### 4. Verify Installation

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. You should see the Packing Checklist app landing page.

---

## Development

### Dev Server

Start the Vite development server with hot module replacement (HMR):

```bash
npm run dev
```

- **URL**: http://localhost:5173
- **HMR**: Changes to `.vue`, `.ts`, `.css` files auto-reload
- **Service Worker**: Not active in dev mode (use preview for SW testing)
- **IndexedDB**: Available in dev mode at `IndexedDB > PackingDB` in browser DevTools

### Project Structure

```text
src/
├── assets/          # Static assets (icons, images)
├── components/      # Vue 3 components (Composition API)
├── composables/     # Vue 3 composables (shared logic)
├── db/              # IndexedDB via Dexie.js (schema, seed data)
├── router/          # Vue Router configuration
├── stores/          # Pinia state management
├── services/        # Business logic services
├── views/           # Vue Router view components
├── App.vue          # Root component
└── main.ts          # App entry point
```

### Key Files

- **`src/db/schema.ts`**: Dexie.js database schema with versioned migrations
- **`src/db/seed.ts`**: Default categories and items seed data
- **`vite.config.ts`**: Vite configuration (PWA plugin, Tailwind, path aliases)
- **`tailwind.config.ts`**: Tailwind CSS configuration (mobile-first, touch utilities)
- **`tsconfig.json`**: TypeScript strict mode configuration

### Dev Workflow

1. **Feature Development**: Create/edit files in `src/` (components, services, stores)
2. **Type Checking**: Run `npm run type-check` to verify TypeScript types
3. **Linting**: Run `npm run lint` to check code style (ESLint + Prettier)
4. **Testing**: Run `npm run test:unit` for unit tests, `npm run test:e2e` for E2E tests
5. **Commit**: Commit after each task completion with descriptive message

---

## Testing

### Unit Tests (Vitest)

Run unit and integration tests with Vitest (jsdom environment):

```bash
npm run test:unit
```

- **Location**: `tests/unit/`
- **Coverage**: Run `npm run test:unit -- --coverage` to generate coverage report
- **Watch Mode**: Run `npm run test:unit -- --watch` for interactive testing

Example test:

```typescript
// tests/unit/services/ChecklistService.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ChecklistService } from '@/services/ChecklistService';
import { db } from '@/db/schema';

describe('ChecklistService', () => {
  beforeEach(async () => {
    await db.delete(); // Reset database before each test
    await db.open();
  });

  it('generates checklist with correct item quantities', async () => {
    const service = new ChecklistService();
    const result = await service.generateChecklist({
      start_date: '2025-01-01',
      end_date: '2025-01-07',
      buffer_days: 1,
      formal_attire: false,
      swimming: true,
      hot_weather: true,
      washing_machine_available: false,
      selected_categories: [1, 2, 3], // Clothes, Toiletries, Electronics
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items.length).toBeGreaterThan(0);
      // 8 days total (7 + 1 buffer), no washing → 8 shirts
      const tshirtItem = result.data.items.find(i => i.name === 'T-shirt');
      expect(tshirtItem?.quantity).toBe(8);
    }
  });
});
```

### E2E Tests (Playwright)

Run end-to-end tests with Playwright (including offline scenarios):

```bash
npm run test:e2e
```

- **Location**: `tests/e2e/`
- **Browsers**: Chromium, Firefox, WebKit (configurable in `playwright.config.ts`)
- **Offline Testing**: Uses Playwright's offline mode to simulate network conditions
- **Headed Mode**: Run `npm run test:e2e -- --headed` to see browser UI

Example E2E test:

```typescript
// tests/e2e/offline.spec.ts
import { test, expect } from '@playwright/test';

test('checklist persists after going offline and reopening app', async ({ page, context }) => {
  await page.goto('http://localhost:4173'); // Preview server

  // Generate checklist
  await page.click('text=New Checklist');
  await page.fill('input[name="start_date"]', '2025-01-01');
  await page.fill('input[name="end_date"]', '2025-01-07');
  await page.click('button:has-text("Generate")');

  // Check an item
  await page.click('input[type="checkbox"][data-item-name="T-shirt"]');

  // Go offline
  await context.setOffline(true);

  // Reload app
  await page.reload();

  // Verify checked item persists
  const checkbox = page.locator('input[type="checkbox"][data-item-name="T-shirt"]');
  await expect(checkbox).toBeChecked();
});
```

### Lighthouse Audit

Run Lighthouse audit to verify PWA quality gates (≥90 all categories):

```bash
npm run lighthouse
```

This command runs Lighthouse CI and generates a report in `lighthouse-report.html`.

**Required Gates**:
- ✅ Performance: ≥90
- ✅ Accessibility: ≥90
- ✅ Best Practices: ≥90
- ✅ SEO: ≥90
- ✅ PWA: ≥90

---

## Building for Production

### 1. Build Production Bundle

```bash
npm run build
```

This command:
- Compiles TypeScript to JavaScript
- Bundles Vue 3 components with Vite
- Generates Service Worker with Workbox (via Vite PWA Plugin)
- Purges unused Tailwind CSS classes
- Minifies and gzips output

**Output**: `dist/` directory with:
- `index.html`: Entry point
- `assets/*.js`: JavaScript bundles (code-split by route and vendor)
- `assets/*.css`: Minified CSS
- `manifest.json`: Web App Manifest
- `sw.js`: Service Worker (generated by Vite PWA Plugin)
- `icons/`: PWA icons (192x192, 512x512, maskable)

### 2. Preview Production Build

Preview the production build locally with Vite's preview server:

```bash
npm run preview
```

Open [http://localhost:4173](http://localhost:4173) to test the production build.

**Features to Test**:
- ✅ App loads offline after initial visit (Service Worker caches assets)
- ✅ Checklist generation works offline
- ✅ Item checked states persist after browser close/reopen
- ✅ PWA install prompt appears (desktop) or "Add to Home Screen" (mobile)
- ✅ Installed app opens in standalone mode (no browser chrome)

### 3. Analyze Bundle Size

Analyze bundle size to ensure it meets the ~200KB gzipped target:

```bash
npm run build -- --mode analyze
```

This generates a visual bundle size report in `stats.html`. Check that:
- Initial JS bundle ≤ 200KB gzipped (CI warns if exceeded)
- Vendor chunks (Vue, Dexie) are cached separately
- Route chunks are lazy-loaded (Settings view not in main bundle)

---

## Installing PWA

### Desktop (Chrome/Edge)

1. Open http://localhost:4173 (preview server) in Chrome or Edge
2. Look for the install icon in the address bar (⊕ icon)
3. Click "Install Packing Checklist"
4. App opens in standalone window (no browser chrome)

### Mobile (Android Chrome)

1. Open http://localhost:4173 on Android Chrome
2. Tap the menu (⋮) and select "Add to Home Screen"
3. App icon appears on home screen
4. Tap icon to open app in standalone mode

### Mobile (iOS Safari)

1. Open http://localhost:4173 on iOS Safari
2. Tap the Share button (⎆) at the bottom
3. Scroll down and tap "Add to Home Screen"
4. App icon appears on home screen
5. Tap icon to open app in standalone mode

**Note**: iOS Safari requires HTTPS for PWA installability in production. Localhost is exempt for development.

---

## Deploying to Production

### Hosting Requirements

- **HTTPS**: Required for Service Worker and PWA installability (Let's Encrypt recommended)
- **Static hosting**: App is fully client-side; no server-side rendering required
- **SPA routing**: Configure server to serve `index.html` for all routes (hash mode routing preferred)

### Recommended Platforms

- **Netlify**: Automatic HTTPS, PWA-friendly, deploy via Git push
- **Vercel**: Automatic HTTPS, zero-config PWA support, deploy via Git push
- **GitHub Pages**: Free hosting with HTTPS, requires manual build/deploy
- **Cloudflare Pages**: Automatic HTTPS, fast global CDN, deploy via Git push

### Deployment Steps (Netlify Example)

1. **Connect Repository**: Link GitHub repo to Netlify
2. **Configure Build**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Deploy**: Push to `main` branch to trigger automatic deployment
4. **Verify PWA**: Test installability and offline functionality on production URL

### Post-Deployment Checklist

- ✅ HTTPS enabled (valid SSL certificate)
- ✅ PWA installable on iOS Safari 15+, Android Chrome 90+, Desktop
- ✅ Lighthouse audit ≥90 all categories on production URL
- ✅ Offline functionality works (Service Worker caches assets)
- ✅ IndexedDB persists data across sessions

---

## Troubleshooting

### Service Worker Not Updating

**Problem**: Changes not reflected after redeployment.

**Solution**: Increment Service Worker version in `vite.config.ts` or clear browser cache manually:
- Chrome: DevTools → Application → Service Workers → Unregister
- Firefox: DevTools → Application → Service Workers → Unregister

### IndexedDB Not Persisting

**Problem**: Data lost after browser close/reopen.

**Solution**: Check browser privacy settings. Some browsers (Safari Private Browsing, Firefox Strict Tracking Protection) block IndexedDB in private/incognito mode.

### PWA Not Installable

**Problem**: Install prompt doesn't appear.

**Solution**:
- Verify HTTPS is enabled (required for production)
- Check Web App Manifest is valid: DevTools → Application → Manifest
- Verify Service Worker is registered: DevTools → Application → Service Workers
- Check Lighthouse PWA audit for specific issues

### Bundle Size Exceeds 200KB

**Problem**: CI warns that bundle size > 200KB gzipped.

**Solution**:
- Analyze bundle with `npm run build -- --mode analyze`
- Lazy-load non-critical routes (Settings view should already be lazy-loaded)
- Remove unused dependencies or replace with lighter alternatives
- Enable Vite's `build.minify: 'terser'` for better compression

---

## Environment Variables

Create `.env.local` file for local development overrides (not committed to Git):

```bash
# .env.local
VITE_APP_TITLE=Packing Checklist (Dev)
VITE_DB_NAME=PackingDB_Dev
```

**Available Variables**:
- `VITE_APP_TITLE`: Override app title in Web App Manifest (default: "Packing Checklist")
- `VITE_DB_NAME`: Override IndexedDB database name (default: "PackingDB")

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR (http://localhost:5173) |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally (http://localhost:4173) |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:unit -- --watch` | Run Vitest in watch mode |
| `npm run test:unit -- --coverage` | Generate test coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e -- --headed` | Run Playwright with browser UI |
| `npm run type-check` | Run TypeScript type checking |
| `npm run lint` | Run ESLint + Prettier checks |
| `npm run lint -- --fix` | Auto-fix linting issues |
| `npm run lighthouse` | Run Lighthouse CI audit |

---

## Next Steps

- **Phase 2**: Run `/speckit.tasks` to generate `tasks.md` with implementation steps
- **Development**: Start implementing services, components, and views per task breakdown
- **Testing**: Write unit/E2E tests alongside feature development
- **Deployment**: Deploy to staging environment and run Lighthouse audit

---

## Support & Documentation

- **Spec**: [spec.md](spec.md) - Feature requirements and user scenarios
- **Plan**: [plan.md](plan.md) - Technical context and architecture
- **Research**: [research.md](research.md) - Technical decisions and best practices
- **Data Model**: [data-model.md](data-model.md) - Dexie.js schema and types
- **Contracts**: [contracts/](contracts/) - TypeScript service interfaces
