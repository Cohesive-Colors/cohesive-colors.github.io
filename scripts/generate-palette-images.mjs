/**
 * Rasterises the social images for every curated palette.
 *
 * They have to be real files: og:image needs an absolute URL, and Pinterest
 * saves from an <img> in the page — a data: URI or a canvas render satisfies
 * neither. Output goes to public/social/, which is git-ignored and rebuilt on
 * demand, so ~30 MB of derived PNGs never lands in the repository.
 *
 *   npm run images:palettes           # only what is missing
 *   npm run images:palettes -- --force
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flag } from './flags.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const outDir = resolve(root, 'public/social');
const force = flag('force');

const { default: sharp } = await import('sharp');
const { toSvg, toPinCard, PIN_VARIANTS } = await import('../tests/.build/engine.mjs');

const palettes = JSON.parse(readFileSync(resolve(root, 'src/lib/data/palettes.json'), 'utf8'));
mkdirSync(outDir, { recursive: true });

let written = 0;
let skipped = 0;

const started = Date.now();
const total = palettes.length * (1 + PIN_VARIANTS.length);
let done = 0;
let lastPaint = 0;
let lastLogged = 0;

/**
 * A cold run renders nearly two thousand images and takes minutes. Without
 * output that is indistinguishable from a hang, so progress is reported on one
 * rewritten line.
 */
function progress() {
  done++;
  const now = Date.now();
  const tty = Boolean(process.stdout.isTTY);
  // A terminal gets a smooth redrawn line; a log file gets a line every 200
  // images, which is legible in CI without thousands of rows.
  const due = done === total || (tty ? now - lastPaint >= 300 : done - lastLogged >= 200);
  if (!due) return;
  lastPaint = now;
  lastLogged = done;

  const share = done / total;
  const elapsed = (now - started) / 1000;
  const left = share > 0.02 ? Math.round(elapsed / share - elapsed) : null;
  const bar = '#'.repeat(Math.round(share * 24)).padEnd(24, '.');
  const eta = left === null ? 'estimating' : left > 60 ? `${Math.ceil(left / 60)}m left` : `${left}s left`;
  const line = `  [${bar}] ${String(Math.round(share * 100)).padStart(3)}%  ${done}/${total}  ${eta}   `;

  if (tty) process.stdout.write(`\r${line}`);
  else console.log(line.trim());
}

async function render(svg, file, colors) {
  if (!force && existsSync(file)) {
    skipped++;
    progress();
    return;
  }
  await sharp(Buffer.from(svg))
    .png({ palette: true, colors, compressionLevel: 9 })
    .toFile(file);
  written++;
  progress();
}
for (const palette of palettes) {
  await render(toSvg(palette, { width: 1200, height: 630 }), resolve(outDir, `${palette.id}-og.png`), 128);
  // One card per layout: Pinterest treats a repeat of the same image as a
  // duplicate, so variants are what let a page be pinned again months later.
  for (const variant of PIN_VARIANTS) {
    const suffix = variant === 'stripes' ? 'pin' : `pin-${variant}`;
    await render(toPinCard(palette, variant), resolve(outDir, `${palette.id}-${suffix}.png`), 64);
  }
}

if (process.stdout.isTTY) process.stdout.write('\n');

const bytes = readdirSync(outDir).reduce((sum, f) => sum + statSync(resolve(outDir, f)).size, 0);

// A manifest lets the pages link images without probing the filesystem.
writeFileSync(
  resolve(root, 'src/lib/data/social.json'),
  JSON.stringify({ ids: palettes.map((p) => p.id) }) + '\n',
);

console.log(
  `${written} images written, ${skipped} already present, ` +
    `${Math.round(bytes / 1024 / 102.4) / 10} MB in public/social (${Math.round(
      (Date.now() - started) / 1000,
    )}s)`,
);
