// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  redirects: {
    '/': '/maintenance',
  },
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
      rollupOptions: {
        output: {
          manualChunks: {
            'three': ['three'],
            'gsap': ['gsap'],
            'spline': ['@splinetool/loader'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@splinetool/loader'],
    },
    server: {
      warmup: {
        clientFiles: [
          './src/components/**/*.{jsx,tsx}',
          './src/pages/**/*.astro',
        ],
      },
    },
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
});
