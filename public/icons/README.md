# PWA Icons

This directory will contain the PWA icons:
- icon-192x192.png (192x192 px)
- icon-512x512.png (512x512 px)
- icon-maskable-512x512.png (512x512 px with safe zone for Android adaptive icons)

## Placeholder

For now, you can create simple placeholder icons or use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) to generate proper icons from an SVG source.

Example generation command:
```bash
npx @vite-pwa/assets-generator --preset minimal public/logo.svg public/icons
```

## Requirements

- 192x192: Standard PWA icon (iOS, Android)
- 512x512: High-resolution PWA icon
- Maskable: Android adaptive icon (includes safe zone)
- Format: PNG with transparency
- Background: Should work on light and dark backgrounds
