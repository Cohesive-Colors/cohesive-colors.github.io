import {
  clamp,
  fromLinearRgb,
  fromOklab,
  lerp,
  lerpHue,
  toGamut,
  toLinearRgb,
  toOklab,
  toOklch,
} from './core';
import type { BlendMode, CohesionSettings, Oklch } from './types';

export const DEFAULT_COHESION: CohesionSettings = {
  tint: '#f39c12',
  alpha: 0.22,
  preserveLightness: 0.72,
  blend: 'overlay',
  hueBias: 0.38,
  minDeltaL: 0.055,
  targetChroma: 0.085,
};

type Channel = (base: number, layer: number) => number;

const BLENDS: Record<BlendMode, Channel> = {
  mix: (_b, l) => l,
  multiply: (b, l) => b * l,
  screen: (b, l) => 1 - (1 - b) * (1 - l),
  overlay: (b, l) => (b <= 0.5 ? 2 * b * l : 1 - 2 * (1 - b) * (1 - l)),
  'soft-light': (b, l) =>
    l <= 0.5
      ? b - (1 - 2 * l) * b * (1 - b)
      : b + (2 * l - 1) * ((b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b),
};

/**
 * Step 2 of the Cohesive Colors pipeline.
 *
 * The master key colour is composited over every swatch in *linear* sRGB —
 * the same maths an image editor uses for a blend layer — and the result is
 * then dragged back towards each swatch's original OKLab lightness. Blending
 * unifies hue and chroma (that is where the shared "atmosphere" comes from);
 * restoring lightness is what stops the palette collapsing into one flat tone.
 */
export function blendWithTint(color: Oklch, tint: Oklch, settings: CohesionSettings): Oklch {
  const alpha = clamp(settings.alpha, 0, 0.5);
  if (alpha === 0) return color;

  const fn = BLENDS[settings.blend] ?? BLENDS.overlay;
  const base = toLinearRgb(color);
  const layer = toLinearRgb(tint);

  const mixed: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const blended = fn(base[i]!, layer[i]!);
    mixed[i] = lerp(base[i]!, blended, alpha);
  }

  const blendedLab = toOklab(fromLinearRgb(mixed));
  const originalL = color.l;
  const blended = fromOklab({
    l: lerp(blendedLab.l, originalL, clamp(settings.preserveLightness, 0, 1)),
    a: blendedLab.a,
    b: blendedLab.b,
  });

  // Hue pull. Channel blends leave clipped primaries untouched (overlay on a
  // pure red is a no-op), so the shared hue axis is applied explicitly, in
  // OKLCH, where moving hue leaves lightness and chroma alone.
  const bias = clamp(settings.hueBias ?? 0, 0, 1) * alpha * 2;
  if (bias <= 0) return blended;
  return { ...blended, h: lerpHue(blended.h, tint.h, clamp(bias, 0, 1)) };
}

/**
 * Step 3: contrast guard. Sorts by lightness, pushes neighbours apart until
 * every adjacent pair clears `minDeltaL`, then re-seats the ramp inside the
 * original lightness envelope so the palette keeps its overall key.
 */
export function enforceContrast(colors: Oklch[], minDeltaL: number): Oklch[] {
  if (colors.length < 2) return colors;

  const order = colors.map((c, i) => ({ c, i })).sort((a, b) => a.c.l - b.c.l);
  const lo = order[0]!.c.l;
  const hi = order[order.length - 1]!.c.l;
  const needed = minDeltaL * (order.length - 1);
  const span = Math.max(hi - lo, 1e-6);

  const ls = order.map((o) => o.c.l);

  if (span < needed) {
    // Not enough room: rebuild an even ramp centred on the original mid-point.
    const mid = (lo + hi) / 2;
    const width = Math.min(needed, 0.9);
    const start = clamp(mid - width / 2, 0.05, 0.95 - width);
    for (let i = 0; i < ls.length; i++) ls[i] = start + (width * i) / (ls.length - 1);
  } else {
    // Enough room: only nudge the pairs that are too close together.
    for (let i = 1; i < ls.length; i++) {
      if (ls[i]! - ls[i - 1]! < minDeltaL) ls[i] = ls[i - 1]! + minDeltaL;
    }
    const overflow = ls[ls.length - 1]! - hi;
    if (overflow > 0) {
      const shift = Math.min(overflow, lo - 0.04);
      for (let i = 0; i < ls.length; i++) ls[i] = ls[i]! - shift;
    }
  }

  const out = colors.slice();
  order.forEach((o, rank) => {
    out[o.i] = { ...o.c, l: clamp(ls[rank]!, 0.04, 0.98) };
  });
  return out;
}

/**
 * Step 3b: vibrancy guard. A heavy overlay drains chroma and everything turns
 * to mud, so the palette's mean chroma is scaled back towards a target — but
 * only upwards, and never past what sRGB can actually show at that lightness.
 */
export function enforceVibrancy(colors: Oklch[], targetChroma: number): Oklch[] {
  if (!colors.length) return colors;
  const mean = colors.reduce((sum, c) => sum + c.c, 0) / colors.length;
  if (mean >= targetChroma || mean < 1e-4) return colors;

  const factor = clamp(targetChroma / mean, 1, 1.85);
  return colors.map((c) => toGamut({ ...c, c: Math.min(c.c * factor, 0.37) }));
}

export interface CohesionResult {
  colors: Oklch[];
  raw: Oklch[];
}

/**
 * Orders a palette into a clean lightness ramp — the reason a good palette
 * card reads as one object instead of a row of unrelated tiles. The same
 * permutation is applied to the untouched source so the before/after toggle
 * compares like with like.
 */
export function orderByLightness<T extends { l: number }>(
  colors: T[],
  descending: boolean,
): number[] {
  return colors
    .map((c, i) => ({ l: c.l, i }))
    .sort((a, b) => (descending ? b.l - a.l : a.l - b.l))
    .map((x) => x.i);
}

/** Runs the full cohesion pass over a set of raw swatches. */
export function cohere(raw: Oklch[], settings: CohesionSettings): CohesionResult {
  const tint = toOklch(settings.tint);
  let colors = raw.map((c) => blendWithTint(c, tint, settings));
  colors = enforceContrast(colors, settings.minDeltaL);
  colors = enforceVibrancy(colors, settings.targetChroma);
  return { colors: colors.map(toGamut), raw };
}
