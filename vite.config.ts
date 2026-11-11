import { defineConfig } from 'vite';

// GitHub Pages serves this project from /comfy/
export default defineConfig({
  base: '/comfy/',
  build: { target: 'es2020', sourcemap: false },
});
