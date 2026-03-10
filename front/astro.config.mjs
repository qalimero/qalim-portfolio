// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  redirects: {
    '/': '/maintenance',
  },
  integrations: [react(), icon({
    iconDir: 'src/assets/icons',
  })],
  devToolbar: {
    enabled: false,
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
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
