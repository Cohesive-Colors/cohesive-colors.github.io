import { pick, type Rng } from './random';
import type { Mood, Oklch } from './types';

interface HueFamily {
  name: string;
  from: number;
  to: number;
  nouns: string[];
}

const FAMILIES: HueFamily[] = [
  { name: 'Red', from: 345, to: 20, nouns: ['Ember', 'Crimson', 'Rosewood', 'Poppy', 'Cinnabar'] },
  { name: 'Orange', from: 20, to: 50, nouns: ['Amber', 'Harvest', 'Clay', 'Marmalade', 'Copper'] },
  { name: 'Yellow', from: 50, to: 95, nouns: ['Saffron', 'Honey', 'Wheat', 'Citrine', 'Sunbeam'] },
  { name: 'Green', from: 95, to: 165, nouns: ['Fern', 'Moss', 'Juniper', 'Basil', 'Meadow'] },
  { name: 'Teal', from: 165, to: 205, nouns: ['Lagoon', 'Seafoam', 'Tide', 'Cyan', 'Reef'] },
  { name: 'Blue', from: 205, to: 260, nouns: ['Harbour', 'Cobalt', 'Denim', 'Glacier', 'Indigo'] },
  { name: 'Purple', from: 260, to: 305, nouns: ['Iris', 'Amethyst', 'Orchid', 'Velvet', 'Lilac'] },
  { name: 'Pink', from: 305, to: 345, nouns: ['Blush', 'Fuchsia', 'Peony', 'Rosé', 'Magnolia'] },
];

export function hueFamily(hue: number): HueFamily {
  const h = ((hue % 360) + 360) % 360;
  return (
    FAMILIES.find((f) => (f.from > f.to ? h >= f.from || h < f.to : h >= f.from && h < f.to)) ??
    FAMILIES[0]!
  );
}

export const HUE_FAMILY_NAMES = FAMILIES.map((f) => f.name);

const ADJECTIVES = [
  'Quiet', 'Soft', 'Deep', 'Faded', 'Golden', 'Northern', 'Velvet', 'Electric',
  'Dusty', 'Coastal', 'Midnight', 'Sunlit', 'Antique', 'Hazy', 'Woven', 'Still',
];

const FORMS = [
  (adj: string, noun: string) => `${adj} ${noun}`,
  (adj: string, noun: string) => `${noun} ${adj === 'Quiet' ? 'Hush' : 'Drift'}`,
  (_adj: string, noun: string) => `Whispers of ${noun}`,
  (adj: string, noun: string) => `${noun} & ${adj}`,
  (adj: string, noun: string) => `${adj} ${noun} Study`,
  (_adj: string, noun: string) => `${noun} Serenade`,
];

export function namePalette(rng: Rng, colors: Oklch[]): string {
  const dominant = dominantHue(colors);
  const family = hueFamily(dominant);
  const adj = pick(rng, ADJECTIVES);
  const noun = pick(rng, family.nouns);
  return pick(rng, FORMS)(adj, noun);
}

/** Chroma-weighted mean hue — grey swatches should not drag the average. */
export function dominantHue(colors: Oklch[]): number {
  let x = 0;
  let y = 0;
  for (const c of colors) {
    const w = Math.max(c.c, 0.004);
    x += Math.cos((c.h * Math.PI) / 180) * w;
    y += Math.sin((c.h * Math.PI) / 180) * w;
  }
  if (x === 0 && y === 0) return 0;
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * How much of a palette belongs to each hue family, 0..1 per family.
 *
 * A single chroma-weighted *average* hue is the wrong answer for a filter:
 * a palette of navy, green and lavender averages out to orange, so "Orange"
 * returns palettes with no orange in them. This weighs each swatch by its own
 * chroma instead — near-greys contribute almost nothing — and reports which
 * families are actually visible.
 */
export function familyWeights(colors: Oklch[]): Map<string, number> {
  const weights = new Map<string, number>();
  let total = 0;
  for (const c of colors) {
    // Below ~0.03 chroma the hue is not perceptible; ignore those swatches.
    const w = Math.max(0, c.c - 0.028);
    if (w <= 0) continue;
    const name = hueFamily(c.h).name;
    weights.set(name, (weights.get(name) ?? 0) + w);
    total += w;
  }
  if (!total) return weights;
  for (const [k, v] of weights) weights.set(k, v / total);
  return weights;
}

/** Families carrying at least `minWeight` of the palette's visible colour. */
export function paletteFamilies(colors: Oklch[], minWeight = 0.18): string[] {
  return [...familyWeights(colors).entries()]
    .filter(([, w]) => w >= minWeight)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

export function paletteStats(colors: Oklch[]) {
  const n = colors.length || 1;
  const meanL = colors.reduce((s, c) => s + c.l, 0) / n;
  const meanC = colors.reduce((s, c) => s + c.c, 0) / n;
  const minL = Math.min(...colors.map((c) => c.l));
  const maxL = Math.max(...colors.map((c) => c.l));
  const hue = dominantHue(colors);
  // Angular spread of hues, chroma-weighted.
  const spread = colors.reduce((s, c) => {
    const d = Math.abs(((c.h - hue + 540) % 360) - 180);
    return s + d * Math.max(c.c, 0.004);
  }, 0) / colors.reduce((s, c) => s + Math.max(c.c, 0.004), 0);
  return { meanL, meanC, minL, maxL, hue, spread };
}

export function classifyMoods(colors: Oklch[]): Mood[] {
  const { meanL, meanC, hue, spread } = paletteStats(colors);
  const moods: Mood[] = [];

  if (meanC >= 0.15) moods.push('Vibrant');
  if (meanC <= 0.055) moods.push('Muted');
  if (meanL >= 0.745 && meanC <= 0.135) moods.push('Pastel');
  if (meanL <= 0.5) moods.push('Dark');
  if (spread <= 22) moods.push('Monochrome');
  if (meanC >= 0.17 && meanL <= 0.66 && (hue >= 260 || hue <= 20 || (hue >= 170 && hue <= 215))) {
    moods.push('Cyberpunk');
  }
  if (hue >= 20 && hue <= 95 && meanC <= 0.12 && meanL >= 0.45) moods.push('Earthy');
  if (hue >= 185 && hue <= 268 && meanC <= 0.09 && meanL >= 0.58) moods.push('Nordic');
  if (hue >= 10 && hue <= 70 && meanC >= 0.1) moods.push('Warm Sunset');
  if (meanC >= 0.09 && meanC < 0.17 && meanL >= 0.5 && hue >= 25 && hue <= 200) moods.push('Retro');

  // Most specific labels first so the card chip is the informative one.
  const priority: Mood[] = [
    'Cyberpunk', 'Nordic', 'Warm Sunset', 'Earthy', 'Retro', 'Pastel',
    'Vibrant', 'Dark', 'Monochrome', 'Muted',
  ];
  const unique = Array.from(new Set(moods)).sort(
    (a, b) => priority.indexOf(a) - priority.indexOf(b),
  );
  return unique.length ? unique.slice(0, 3) : ['Muted'];
}

export const ALL_MOODS: Mood[] = [
  'Pastel', 'Vibrant', 'Muted', 'Dark', 'Earthy', 'Nordic', 'Cyberpunk', 'Retro', 'Warm Sunset', 'Monochrome',
];
