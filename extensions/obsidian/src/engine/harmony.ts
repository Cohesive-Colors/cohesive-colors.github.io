import { clamp } from './core';
import { pick, rand, randInt, type Rng } from './random';
import type { HarmonyKind, Oklch } from './types';

/**
 * Hue offsets (degrees) each harmony walks through. The generator cycles the
 * offsets and adds a small per-step jitter so 10-swatch palettes never look
 * like a rubber-stamped repeat of the 4-swatch version.
 */
const HUE_STEPS: Record<Exclude<HarmonyKind, 'random'>, number[]> = {
  analogous: [0, 18, -18, 34, -34, 50, -50, 64, -64, 78],
  complementary: [0, 180, 12, 192, -14, 168, 26, 206, -28, 154],
  'split-complementary': [0, 150, 210, 18, 168, 192, -18, 132, 228, 36],
  triadic: [0, 120, 240, 16, 136, 256, -16, 104, 224, 40],
  tetradic: [0, 60, 180, 240, 20, 80, 200, 260, -20, 40],
  monochrome: [0, 4, -4, 8, -8, 12, -12, 3, -3, 6],
};

export const HARMONIES: HarmonyKind[] = [
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'monochrome',
  'random',
];

export interface HarmonyOptions {
  size: number;
  harmony: HarmonyKind;
  baseHue: number;
  lightnessRange: [number, number];
  chromaRange: [number, number];
}

/**
 * Builds the pre-cohesion swatches. Lightness is distributed monotonically
 * across the requested range (that is what gives a ColorDrop-style ramp),
 * chroma follows a gentle arc so the mid swatches carry the most colour.
 */
export function generateHarmony(rng: Rng, opts: HarmonyOptions): Oklch[] {
  const { size, harmony, baseHue } = opts;
  const [lMin, lMax] = opts.lightnessRange;
  const [cMin, cMax] = opts.chromaRange;
  const steps = harmony === 'random' ? null : HUE_STEPS[harmony];
  const descending = rng() < 0.5;
  // "Random" still stays inside a window around the base hue — a genuinely
  // uniform hue draw produces the clashing sets this whole app exists to avoid.
  const window = rand(rng, 40, 110);

  const out: Oklch[] = [];
  for (let i = 0; i < size; i++) {
    const t = size === 1 ? 0.5 : i / (size - 1);
    const ramp = descending ? 1 - t : t;

    const hue = steps
      ? baseHue + steps[i % steps.length]! + rand(rng, -6, 6) + Math.floor(i / steps.length) * 9
      : baseHue + rand(rng, -window, window);

    // Ease the lightness ramp slightly so the extremes do not bunch up.
    const eased = ramp * ramp * (3 - 2 * ramp);
    const l = clamp(lMin + (lMax - lMin) * eased + rand(rng, -0.025, 0.025), 0.06, 0.98);

    // Chroma arc: peaks in the middle of the ramp, softens at both ends.
    const arc = Math.sin(Math.PI * (0.18 + 0.64 * t));
    const c = clamp(cMin + (cMax - cMin) * arc * rand(rng, 0.82, 1.12), 0, 0.37);

    out.push({ mode: 'oklch', l, c, h: ((hue % 360) + 360) % 360 });
  }
  return out;
}

export interface HarmonyPreset {
  lightnessRange: [number, number];
  chromaRange: [number, number];
}

/** Mood presets used by the feed tabs and the generator's vibe control. */
export const PRESETS = {
  balanced: { lightnessRange: [0.36, 0.9], chromaRange: [0.05, 0.16] },
  vibrant: { lightnessRange: [0.45, 0.86], chromaRange: [0.13, 0.27] },
  muted: { lightnessRange: [0.42, 0.9], chromaRange: [0.018, 0.07] },
  pastel: { lightnessRange: [0.76, 0.95], chromaRange: [0.04, 0.11] },
  dark: { lightnessRange: [0.18, 0.62], chromaRange: [0.05, 0.15] },
  earthy: { lightnessRange: [0.35, 0.88], chromaRange: [0.035, 0.1] },
  cyberpunk: { lightnessRange: [0.28, 0.82], chromaRange: [0.16, 0.3] },
} satisfies Record<string, HarmonyPreset>;

export type PresetName = keyof typeof PRESETS;

export function randomPreset(rng: Rng): PresetName {
  return pick(rng, ['balanced', 'balanced', 'vibrant', 'muted', 'pastel', 'dark', 'earthy'] as const);
}

export function randomSize(rng: Rng): number {
  // Weighted towards 4-6 swatches, still reaching the full 3..10 range.
  const table = [3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 9, 10];
  return table[randInt(rng, 0, table.length - 1)]!;
}
