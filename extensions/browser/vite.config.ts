import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The extension reuses the site's colour engine straight from ../../src through
// the same `@/…` alias the site and the Android app use. Only framework-free
// modules (src/lib/color/**, palette-url, data) may be imported from there.
//
// `vite build --mode firefox` writes dist/firefox; any other mode is Chrome/Edge.
export default defineConfig(({ mode }) => {
  const firefox = mode === 'firefox';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': here('../../src') },
      // Root and extension each have a node_modules; one copy of culori/react.
      dedupe: ['culori', 'react', 'react-dom'],
    },
    base: './',
    build: {
      outDir: firefox ? 'dist/firefox' : 'dist/chrome',
      emptyOutDir: true,
      target: firefox ? 'firefox140' : 'chrome120',
      // Firefox reviewers read the shipped code, so it ships unminified; the
      // source package is still attached because the code is bundled.
      minify: !firefox,
      modulePreload: false,
      // The bundle carries the 480 curated palettes; size is no concern for a local popup.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        input: { popup: here('popup.html') },
      },
    },
  };
});
