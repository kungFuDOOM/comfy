// Dev server for trailer capture: same app, but no hot reload (an edit elsewhere must not reload a page mid-render).
//   npx vite --config tools/trailer/vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: new URL('../..', import.meta.url).pathname,
  base: '/comfy/',
  server: { port: 5174, strictPort: true, hmr: false, watch: null },
});
