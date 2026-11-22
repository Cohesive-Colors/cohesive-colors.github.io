import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The extension reuses the site's colour engine straight from ../../src through
// the same `@/…` alias the site and the Android app use. Only framework-free
// modules (src/lib/color/**, palette-url, data) may be imported from there.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': here('../../src') },
    // Root and extension each have a node_modules; one copy of culori/react.
    dedupe: ['culori', 'react', 'react-dom'],
  },
  base: './',
  build: {
    outDir: 'dist/chrome',
    emptyOutDir: true,
    target: 'chrome120',
    modulePreload: false,
    // The bundle carries the 480 curated palettes; size is not a concern for a local popup.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: { popup: here('popup.html') },
    },
  },
});
