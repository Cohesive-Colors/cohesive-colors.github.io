// Copies the site's colour engine and curated palettes into src/engine/.
//
// The plugin is published from its own GitHub repository (Obsidian reads
// manifest.json, README.md and LICENSE from the repo root), so it cannot reach
// ../../src at build time there. Run this inside the cohesive-colors monorepo
// after changing src/lib/color/** or re-running `npm run seed`, then commit
// src/engine/ together with the change.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const site = join(here, '..', '..', 'src', 'lib');
if (!existsSync(join(site, 'color'))) {
  console.error('src/lib/color not found — run this inside the cohesive-colors monorepo.');
  process.exit(1);
}
const out = join(here, 'src', 'engine');
mkdirSync(out, { recursive: true });

for (const name of readdirSync(join(site, 'color'))) {
  if (name.endsWith('.ts')) copyFileSync(join(site, 'color', name), join(out, name));
}

// Only the fields the plugin uses; keeps main.js small.
const seed = JSON.parse(readFileSync(join(site, 'data', 'palettes.json'), 'utf8'));
const slim = seed.map(({ id, name, slug, colors, raw, harmony, cohesion, moods, hue, seed: s }) => ({
  id, name, slug, colors, raw, harmony, cohesion, moods, hue, seed: s,
}));
writeFileSync(join(out, 'palettes.json'), JSON.stringify(slim));
console.log(`src/engine synced: ${readdirSync(out).length} files, ${slim.length} palettes`);
