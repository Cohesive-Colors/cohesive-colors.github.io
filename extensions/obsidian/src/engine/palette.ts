import { cohere, DEFAULT_COHESION, orderByLightness } from './cohesion';
import { toHex, toOklch } from './core';
import { generateHarmony, PRESETS, randomPreset, randomSize, type PresetName } from './harmony';
import { classifyMoods, dominantHue, namePalette } from './naming';
import { makeRng, pick, rand, randomSeed, type Rng } from './random';
import type { CohesionSettings, GenerateOptions, HarmonyKind, Oklch, Palette } from './types';

const HARMONY_POOL: HarmonyKind[] = [
  'analogous', 'analogous', 'complementary', 'split-complementary',
  'triadic', 'tetradic', 'monochrome', 'random',
];

/** Tints that read as a deliberate light source rather than a random cast. */
export const TINT_SWATCHES = [
  { name: 'Golden Hour', hex: '#f39c12' },
  { name: 'Terracotta', hex: '#e2725b' },
  { name: 'Rose Quartz', hex: '#f4a2b8' },
  { name: 'Amber Lamp', hex: '#ffbf6b' },
  { name: 'Sea Glass', hex: '#7fd4c1' },
  { name: 'Deep Ocean', hex: '#2e6f9e' },
  { name: 'Cold Steel', hex: '#8fa3b8' },
  { name: 'Violet Dusk', hex: '#7d6ba7' },
  { name: 'Moss', hex: '#7d9a5f' },
  { name: 'Neon Magenta', hex: '#ff2bd1' },
  { name: 'Paper', hex: '#f6f1e7' },
  { name: 'Graphite', hex: '#3d4450' },
];

function idFrom(seed: number, size: number): string {
  return `${seed.toString(36)}-${size}`;
}

export function resolveCohesion(partial?: Partial<CohesionSettings>): CohesionSettings {
  return { ...DEFAULT_COHESION, ...partial };
}

export interface GeneratedPalette extends Palette {
  /** Live OKLCH objects, handy for the editor without re-parsing hex. */
  oklch: Oklch[];
}

export function generatePalette(options: Partial<GenerateOptions> = {}): GeneratedPalette {
  const seed = options.seed ?? randomSeed();
  const rng = makeRng(seed);

  const size = Math.min(10, Math.max(3, options.size ?? randomSize(rng)));
  const harmony = options.harmony ?? pick(rng, HARMONY_POOL);
  const preset: PresetName = randomPreset(rng);
  const base = PRESETS[preset];

  const raw = generateHarmony(rng, {
    size,
    harmony,
    baseHue: options.baseHue ?? rand(rng, 0, 360),
    lightnessRange: options.lightnessRange ?? base.lightnessRange,
    chromaRange: options.chromaRange ?? base.chromaRange,
  });

  const cohesion = resolveCohesion(options.cohesion);
  const { colors } = cohere(raw, cohesion);

  // Arrange into a lightness ramp, applying the same order to the source.
  const order = orderByLightness(colors, rng() < 0.5);
  const ordered = order.map((i) => colors[i]!);
  const orderedRaw = order.map((i) => raw[i]!);

  // Pinned swatches survive the cohesion pass untouched.
  const locks = options.locks ?? [];
  const final = ordered.map((c, i) => {
    const lock = locks[i];
    return lock ? toOklch(lock) : c;
  });

  return {
    id: idFrom(seed, size),
    name: namePalette(rng, final),
    colors: final.map(toHex),
    raw: orderedRaw.map(toHex),
    oklch: final,
    harmony,
    cohesion,
    moods: classifyMoods(final),
    hue: Math.round(dominantHue(final)),
    likes: 0,
    createdAt: new Date().toISOString(),
    seed,
  };
}

/** Re-runs only the cohesion stage — used by the live overlay slider. */
export function recohere(palette: Palette, cohesion: CohesionSettings): Palette {
  const raw = palette.raw.map(toOklch);
  const { colors } = cohere(raw, cohesion);
  // Keep the ramp direction the palette already had.
  const descending = toOklch(palette.colors[0]!).l > toOklch(palette.colors[palette.colors.length - 1]!).l;
  const ordered = orderByLightness(colors, descending).map((i) => colors[i]!);
  return {
    ...palette,
    colors: ordered.map(toHex),
    cohesion,
    moods: classifyMoods(ordered),
    hue: Math.round(dominantHue(ordered)),
  };
}

export function paletteFromColors(colors: string[], meta: Partial<Palette> = {}): Palette {
  const oklch = colors.map(toOklch);
  return {
    id: meta.id ?? `custom-${colors.join('').replace(/#/g, '').slice(0, 12)}`,
    name: meta.name ?? 'Custom palette',
    colors,
    raw: meta.raw ?? colors,
    harmony: meta.harmony ?? 'random',
    cohesion: meta.cohesion ?? resolveCohesion(),
    moods: meta.moods ?? classifyMoods(oklch),
    hue: meta.hue ?? Math.round(dominantHue(oklch)),
    likes: meta.likes ?? 0,
    createdAt: meta.createdAt ?? new Date().toISOString(),
    seed: meta.seed ?? 0,
  };
}

export function rngFor(seed: number): Rng {
  return makeRng(seed);
}
