// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// og:image, canonical and the sitemap all need absolute URLs, so `site` must be
// the real origin at build time. The production default is baked in here rather
// than left to an env var: a missing variable in CI would otherwise ship a whole
// site of links pointing at localhost. PUBLIC_SITE_URL still overrides it for
// preview deploys and for a future custom domain.
const site = process.env.PUBLIC_SITE_URL || 'https://cohesive-colors.github.io';

export default defineConfig({
  site,
  integrations: [
    react(),
    sitemap({
      // /palette/view renders from query parameters and 404 is a dead end;
      // neither should be offered to a crawler as a destination.
      filter: (page) => !page.includes('/palette/view') && !page.includes('/saved'),
      changefreq: 'weekly',
      priority: 0.7,
      serialize: (item) => {
        if (item.url.endsWith('/palettes/') || item.url.match(/\/$/) === null) return item;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // Vite 8 / Rolldown can miss the named exports on React's CJS entries,
      // which breaks island hydration in dev with
      // "does not provide an export named 'createRoot'".
      include: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
    },
  },
});
