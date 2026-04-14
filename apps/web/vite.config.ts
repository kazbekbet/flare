import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(rootDir, 'src');

/**
 * Конфигурация Vite для приложения Flare Web.
 * - React 19 (@vitejs/plugin-react)
 * - PWA: autoUpdate, NetworkFirst для /api/*
 * - Алиасы FSD: @app, @pages, @widgets, @features, @entities, @shared
 * - Прокси /api → localhost:3000 в dev-режиме
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxAgeSeconds: 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Flare',
        short_name: 'Flare',
        description: 'Self-hosted E2E мессенджер для близких',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@app': path.resolve(srcDir, 'app'),
      '@pages': path.resolve(srcDir, 'pages'),
      '@widgets': path.resolve(srcDir, 'widgets'),
      '@features': path.resolve(srcDir, 'features'),
      '@entities': path.resolve(srcDir, 'entities'),
      '@shared': path.resolve(srcDir, 'shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
