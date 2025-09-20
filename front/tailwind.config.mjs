import daisyui from 'daisyui';
import { daisyThemes, tailwindTheme } from './src/styles/tokens/tailwind-theme.mjs';

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './public/**/*.html',
  ],
  theme: {
    extend: tailwindTheme,
  },
  plugins: [daisyui],
  daisyui: {
    themes: daisyThemes,
  },
};

export default config;
