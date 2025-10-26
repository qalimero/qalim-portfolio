// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [react(), tailwind({
    applyBaseStyles: false,
  }), icon({
    iconDir: 'src/assets/icons',
  })],
  devToolbar: {
    enabled: false,
  },
  vite: {
    build: {
      // Code splitting for better performance
      rollupOptions: {
        output: {
          manualChunks: {
            'three': ['three'],
            'gsap': ['gsap'],
            'spline': ['@splinetool/loader'],
          },
        },
      },
      // Optimize chunk size
      chunkSizeWarningLimit: 600,
      // Enable CSS code splitting
      cssCodeSplit: true,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@splinetool/loader'],
    },
    // Performance optimizations
    server: {
      warmup: {
        clientFiles: [
          './src/components/**/*.{jsx,tsx}',
          './src/pages/**/*.astro',
        ],
      },
    },
  },
  // Image optimization
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
});