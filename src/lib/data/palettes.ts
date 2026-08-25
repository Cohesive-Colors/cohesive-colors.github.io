import type { Palette } from '@/lib/color/types';
import seed from './palettes.json';

/**
 * The curated feed. Produced by `npm run seed`, which sweeps every swatch
 * count and mood preset, scores candidates on ramp evenness, vibrancy and
 * contrast range, and keeps the winners.
 */
export const SEED_PALETTES = seed as unknown as Palette[];

export const SEED_BY_ID = new Map(SEED_PALETTES.map((p) => [p.id, p]));
