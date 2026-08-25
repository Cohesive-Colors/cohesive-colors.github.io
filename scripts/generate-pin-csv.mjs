/**
 * Builds Pinterest bulk-upload CSVs for every curated palette.
 *
 * Pinterest accepts up to 200 rows per file with the headers
 * board_name,title,description,link,image_url,published_at — so 480 palettes
 * across three layouts become 1440 scheduled pins without touching the UI.
 *
 *   npm run pins:csv -- --board "Color Palettes" --per-day 12 --start 2026-09-01
 *
 * image_url and link must be publicly reachable, so PUBLIC_SITE_URL has to be
 * the deployed origin — Pinterest fetches the image from it at publish time.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './load-env.mjs';
import { option } from './flags.mjs';

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const arg = option;

const site = (process.env.PUBLIC_SITE_URL || 'https://cohesive-colors.github.io').replace(/\/$/, '');
if (!site || site.includes('localhost')) {
  console.error(
    'PUBLIC_SITE_URL must be the deployed origin, Pinterest fetches image_url itself,\n' +
      `so ${site || '(unset)'} would fail on every row.`,
  );
  process.exit(1);
}

const board = arg('board', 'Color Palettes');
const perDay = Number(arg('per-day', 10));
const rowsPerFile = Number(arg('per-file', 150));
const start = new Date(`${arg('start', new Date().toISOString().slice(0, 10))}T09:00:00Z`);
if (Number.isNaN(start.getTime())) {
  console.error('--start must be a date like 2026-09-01');
  process.exit(1);
}

const { PIN_VARIANTS, hueFamily, toOklch } = await import('../tests/.build/engine.mjs');
const palettes = JSON.parse(readFileSync(resolve(root, 'src/lib/data/palettes.json'), 'utf8'));

/** Pinterest caps titles at 100 characters and truncates hard. */
const clamp = (value, max) => (value.length <= max ? value : `${value.slice(0, max - 3).trimEnd()}...`);

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const rows = [];
let index = 0;

const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/** Each layout gets its own wording — three identical pins would read as spam. */
const TITLES = {
  stripes: (p, family) => `${family} color palette, ${p.name} (${p.colors.length} hex codes)`,
  blocks: (p, family, moods) => `${p.name}, ${p.colors.length} ${moods.split(',')[0]} ${family} colors`,
  hero: (p, family) => `${p.name}: ${family} color scheme with hex codes`,
};

const DESCRIPTIONS = {
  stripes: (p, family, moods) =>
    `${p.name}: ${article(moods)} ${moods} ${family} palette of ${p.colors.length} swatches, ` +
    `${p.colors.join(' ').toUpperCase()}. Harmonised in OKLCH, so every colour shares one key tone ` +
    `instead of clashing. Copy the hex codes or export to CSS, Tailwind, SCSS, Swift and Android.`,
  blocks: (p, family, moods) =>
    `A ${moods} ${family} colour scheme built around one shared key colour: ` +
    `${p.colors.join(' ').toUpperCase()}. Every pair is checked against WCAG contrast, so it is safe ` +
    `for real interfaces, not just moodboards. Tap through for the contrast matrix and exports.`,
  hero: (p, family, moods) =>
    `${p.name}, ${p.colors.length} ${family} shades for ${moods} designs. ` +
    `${p.colors.join(' ').toUpperCase()}. Generated with perceptual OKLCH colour maths: the palette ` +
    `is harmonised rather than randomly sampled. Open it to tweak the key colour and re-export.`,
};

// Variant is the OUTER loop on purpose: all 480 "stripes" pins go out first,
// then "blocks", then "hero". At a dozen a day that puts roughly forty days
// between two pins of the same palette — far enough apart to read as fresh
// content rather than a repost.
for (const variant of PIN_VARIANTS) {
  for (const palette of palettes) {
    const family = hueFamily(palette.hue).name.toLowerCase();
    const moods = palette.moods.join(', ').toLowerCase();
    const slot = Math.floor(index / perDay);
    const at = new Date(start.getTime() + slot * 86_400_000 + (index % perDay) * 3_600_000);
    const file = variant === 'stripes' ? 'pin' : `pin-${variant}`;

    rows.push({
      board_name: board,
      title: clamp(TITLES[variant](palette, family, moods), 100),
      description: clamp(DESCRIPTIONS[variant](palette, family, moods), 500),
      link: `${site}/palette/${palette.id}`,
      image_url: `${site}/social/${palette.id}-${file}.png`,
      published_at: at.toISOString().replace('T', ' ').slice(0, 19),
    });
    index++;
  }
}

const header = ['board_name', 'title', 'description', 'link', 'image_url', 'published_at'];
const outDir = resolve(root, 'pinterest');
mkdirSync(outDir, { recursive: true });

const files = [];
for (let i = 0; i < rows.length; i += rowsPerFile) {
  const chunk = rows.slice(i, i + rowsPerFile);
  const name = `pins-${String(files.length + 1).padStart(2, '0')}.csv`;
  writeFileSync(
    resolve(outDir, name),
    [header.join(','), ...chunk.map((r) => header.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n',
  );
  files.push({ name, rows: chunk.length, from: chunk[0].published_at, to: chunk[chunk.length - 1].published_at });
}

console.log(`\n${rows.length} pins across ${files.length} files in pinterest/`);
for (const f of files) console.log(`  ${f.name}  ${String(f.rows).padStart(3)} rows  ${f.from} > ${f.to}`);
console.log(
  `\nBoard: "${board}" · ${perDay} pins/day · images from ${site}/social/\n` +
    'Upload at pinterest.com > Create > Bulk create Pins. Check that the board exists first.\n',
);
