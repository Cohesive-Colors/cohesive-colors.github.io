/**
 * Curates the seed feed.
 *
 * Palettes are generated deterministically, scored, and the best ones are kept
 * under diversity quotas (hue bucket, swatch count, mood) so the feed opens on
 * something that looks hand-picked rather than randomly sampled.
 *
 * Run with: npm run seed
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generatePalette,
  toOklch,
  contrastRatio,
  TINT_SWATCHES,
  PRESETS,
  HARMONIES,
  HUE_FAMILY_NAMES,
  familyWeights,
  paletteStats,
  makeRng,
} from '../tests/.build/engine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** 60 palettes for each swatch count from 3 to 10. */
export const TARGET = 480;
const rng = makeRng(20260822);

function score(palette) {
  const ls = palette.colors.map((h) => toOklch(h).l).sort((a, b) => a - b);
  const cs = palette.colors.map((h) => toOklch(h).c);
  const span = contrastRatio(
    palette.colors.reduce((a, b) => (toOklch(a).l < toOklch(b).l ? a : b)),
    palette.colors.reduce((a, b) => (toOklch(a).l > toOklch(b).l ? a : b)),
  );

  // Even lightness steps read as a designed ramp; clumps read as noise.
  const steps = ls.slice(1).map((l, i) => l - ls[i]);
  const meanStep = steps.reduce((s, v) => s + v, 0) / steps.length;
  const evenness =
    1 - Math.min(1, Math.sqrt(steps.reduce((s, v) => s + (v - meanStep) ** 2, 0) / steps.length) / 0.09);

  const meanC = cs.reduce((s, v) => s + v, 0) / cs.length;
  const vibrancy = Math.min(1, meanC / 0.13);
  const range = Math.min(1, (span - 1.5) / 6);

  // Chroma-weighted hue spread. A wide spread is exactly the clash the
  // cohesion layer is supposed to remove, so it is scored against.
  const { spread } = paletteStats(palette.colors.map(toOklch));
  const coherence = 1 - Math.min(1, spread / 70);

  return evenness * 0.3 + vibrancy * 0.2 + range * 0.3 + coherence * 0.2;
}

const PRESET_NAMES = Object.keys(PRESETS);
const SLOTS = 60; // per swatch count, 3..10 => 480 palettes
const picked = [];

/**
 * Each size gets 12 slots, and the slots walk the harmony list and the mood
 * preset list at different strides. Across the 8 sizes that covers every
 * harmony and every mood preset without letting one dominate the feed.
 */
// Harmonies whose hue jumps are wide enough to need a heavier key colour.
const WIDE = new Set(['complementary', 'split-complementary', 'triadic', 'tetradic', 'random']);

/** Centre of each hue family, used to aim generation at that family. */
const FAMILY_CENTRE = {
  Red: 2, Orange: 35, Yellow: 72, Green: 130, Teal: 185, Blue: 232, Purple: 282, Pink: 325,
};

for (let size = 3; size <= 10; size++) {
  const offset = size - 3;

  for (let slot = 0; slot < SLOTS; slot++) {
    const harmony = HARMONIES[(slot + offset) % HARMONIES.length];
    const presetName = PRESET_NAMES[(slot * 3 + offset) % PRESET_NAMES.length];
    const preset = PRESETS[presetName];
    // Target a hue *family*, not a 30-degree slice: the families are uneven
    // (Orange spans 30 degrees, Green spans 70), so slicing the wheel evenly
    // starves the narrow families and the hue filter comes up empty.
    const family = HUE_FAMILY_NAMES[(offset * SLOTS + slot) % HUE_FAMILY_NAMES.length];
    const centre = FAMILY_CENTRE[family];
    const pool = [];

    for (let i = 0; i < 150; i++) {
      const seed = Math.floor(rng() * 0xffffffff) >>> 0;
      const tint = TINT_SWATCHES[Math.floor(rng() * TINT_SWATCHES.length)];
      const alpha = WIDE.has(harmony) ? 0.22 + rng() * 0.14 : 0.12 + rng() * 0.18;
      const p = generatePalette({
        seed,
        size,
        harmony,
        baseHue: centre + (rng() - 0.5) * 22,
        lightnessRange: preset.lightnessRange,
        chromaRange: preset.chromaRange,
        cohesion: { tint: tint.hex, alpha: Math.round(alpha * 100) / 100 },
      });
      pool.push({ p, s: score(p) });
    }

    // The cohesion pass shifts hues, so the target family is verified on the
    // finished palette rather than assumed from the base hue.
    const onTarget = pool.filter(
      (c) => (familyWeights(c.p.colors.map(toOklch)).get(family) ?? 0) >= 0.25,
    );
    const from = onTarget.length ? onTarget : pool;
    from.sort((a, b) => b.s - a.s);
    picked.push(from[0].p);
  }
}

// Names come from a small word pool, so collisions are inevitable at this
// size. Two pages called "Poppy Drift" mean two identical <title> tags, so the
// duplicates get a distinguishing word drawn from what makes them different.
const QUALIFIERS = ['Light', 'Deep', 'Soft', 'Bold', 'Pale', 'Rich', 'Cool', 'Warm', 'Bright', 'Dusk'];
const seenNames = new Map();
for (const p of picked) {
  const count = seenNames.get(p.name) ?? 0;
  seenNames.set(p.name, count + 1);
  if (count > 0) {
    const stats = paletteStats(p.colors.map(toOklch));
    const byTone = stats.meanL > 0.7 ? 'Light' : stats.meanL < 0.45 ? 'Deep' : stats.meanC > 0.14 ? 'Bold' : 'Soft';
    const word = count === 1 ? byTone : QUALIFIERS[(count - 1) % QUALIFIERS.length];
    p.name = `${word} ${p.name}`;
  }
}

// A qualifier can still land on an existing name; settle any leftovers.
const finalNames = new Set();
for (const p of picked) {
  let name = p.name;
  let n = 2;
  while (finalNames.has(name)) name = `${p.name} No.${n++}`;
  finalNames.add(name);
  p.name = name;
}

// Shuffle so the feed is not ordered by score, then stamp recency + likes.
for (let i = picked.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [picked[i], picked[j]] = [picked[j], picked[i]];
}

const now = Date.UTC(2026, 7, 22, 9, 0, 0);
const HOUR = 3600_000;

const kebab = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'palette';

const out = picked.map((p, i) => {
  const ageHours = Math.round((i / picked.length) ** 1.6 * 24 * 40 + rng() * 6);
  return {
    id: p.id,
    name: p.name,
    slug: `${kebab(p.name)}-palette-${p.id}`,
    colors: p.colors,
    raw: p.raw,
    harmony: p.harmony,
    cohesion: p.cohesion,
    moods: p.moods,
    hue: p.hue,
    // Older palettes have had more time to collect likes.
    likes: Math.round((ageHours / 24) * (2 + rng() * 9) + rng() * 12),
    createdAt: new Date(now - ageHours * HOUR).toISOString(),
    seed: p.seed,
  };
});

const dest = resolve(__dirname, '../src/lib/data/palettes.json');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out, null, 0) + '\n');

console.log(`Wrote ${out.length} curated palettes -> src/lib/data/palettes.json`);
const tally = (fn) => {
  const m = new Map();
  for (const p of out) for (const key of [].concat(fn(p))) m.set(key, (m.get(key) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
};
console.log('sizes  ', tally((p) => p.colors.length).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('moods  ', tally((p) => p.moods).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('harmony', tally((p) => p.harmony).map(([k, v]) => `${k}:${v}`).join('  '));
