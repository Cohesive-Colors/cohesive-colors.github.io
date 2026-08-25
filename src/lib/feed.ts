import { toOklch } from '@/lib/color/core';
import { familyWeights, hueFamily, HUE_FAMILY_NAMES, paletteStats } from '@/lib/color/naming';
import { generatePalette } from '@/lib/color/palette';
import { makeRng } from '@/lib/color/random';
import type { CohesionSettings, Mood, Palette } from '@/lib/color/types';
import type { FeedTab } from '@/store/useAppStore';

export interface FeedFilters {
  query: string;
  moods: Mood[];
  hueFamily: string | null;
  size: number | null;
  /** Restricts the feed to these ids — used by the Saved page. */
  onlyIds?: string[] | null;
}

/**
 * A hue filter should return palettes you can *see* that hue in. 0.18 means the
 * family carries at least ~18% of the palette's visible colour — roughly one
 * strong swatch in five, or two muted ones.
 */
export const MIN_FAMILY_WEIGHT = 0.18;

const weightCache = new WeakMap<Palette, Map<string, number>>();

export function familyWeight(p: Palette, family: string): number {
  let weights = weightCache.get(p);
  if (!weights) {
    weights = familyWeights(p.colors.map(toOklch));
    weightCache.set(p, weights);
  }
  return weights.get(family) ?? 0;
}

const HARMONIZED: Palette['harmony'][] = ['analogous', 'triadic', 'tetradic', 'split-complementary', 'complementary'];

export function matchesFilters(p: Palette, f: FeedFilters): boolean {
  if (f.onlyIds && !f.onlyIds.includes(p.id)) return false;
  if (f.size !== null && p.colors.length !== f.size) return false;
  if (f.moods.length && !f.moods.some((m) => p.moods.includes(m))) return false;
  if (f.hueFamily && familyWeight(p, f.hueFamily) < MIN_FAMILY_WEIGHT) return false;

  const q = f.query.trim().toLowerCase();
  if (!q) return true;

  // A hex query matches on prefix, so "#2a9" finds every near neighbour.
  if (q.startsWith('#')) return p.colors.some((c) => c.toLowerCase().startsWith(q));

  return (
    p.name.toLowerCase().includes(q) ||
    p.harmony.includes(q) ||
    p.moods.some((m) => m.toLowerCase().includes(q)) ||
    hueFamily(p.hue).name.toLowerCase().includes(q) ||
    p.colors.some((c) => c.toLowerCase().includes(q))
  );
}

/** Deterministic shuffle so "Random" stays put until the user asks again. */
export function shuffle<T>(list: T[], seed: number): T[] {
  const rng = makeRng(seed || 1);
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function sortFeed(list: Palette[], tab: FeedTab, shuffleKey: number): Palette[] {
  switch (tab) {
    case 'new':
      return [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case 'popular':
      return [...list].sort((a, b) => b.likes - a.likes || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case 'random':
      return shuffle(list, shuffleKey * 2654435761);
    case 'harmonized':
      return [...list]
        .filter((p) => HARMONIZED.includes(p.harmony))
        .sort((a, b) => HARMONIZED.indexOf(a.harmony) - HARMONIZED.indexOf(b.harmony) || b.likes - a.likes);
    case 'muted':
      return [...list]
        .map((p) => ({ p, c: paletteStats(p.colors.map(toOklch)).meanC }))
        .filter((x) => x.c <= 0.085)
        .sort((a, b) => a.c - b.c)
        .map((x) => x.p);
    case 'vibrant':
      return [...list]
        .map((p) => ({ p, c: paletteStats(p.colors.map(toOklch)).meanC }))
        .filter((x) => x.c >= 0.1)
        .sort((a, b) => b.c - a.c)
        .map((x) => x.p);
  }
}

export function buildFeed(
  source: Palette[],
  filters: FeedFilters,
  tab: FeedTab,
  shuffleKey: number,
): Palette[] {
  const matched = source.filter((p) => matchesFilters(p, filters));
  const sorted = sortFeed(matched, tab, shuffleKey);

  // With a hue filter on, lead with the palettes that carry the most of it —
  // otherwise the first screen is full of palettes that merely graze the family.
  if (filters.hueFamily && tab !== 'random') {
    const family = filters.hueFamily;
    return [...sorted].sort((a, b) => familyWeight(b, family) - familyWeight(a, family));
  }
  return sorted;
}


/** Centre hue of each family, so targeted generation starts in the right place. */
const FAMILY_CENTRE: Record<string, number> = {
  Red: 2, Orange: 35, Yellow: 72, Green: 130, Teal: 185, Blue: 232, Purple: 282, Pink: 325,
};

export interface GenerateMatchingOptions {
  cohesion?: Partial<CohesionSettings>;
  attemptsPerPalette?: number;
}

/**
 * Builds fresh palettes that satisfy the filters currently on screen.
 *
 * Generating blind is what makes the button feel broken: with a mood or hue
 * filter active the new palettes simply never appear. Free-text search is
 * ignored on purpose — a generated palette cannot be expected to contain a
 * name the user typed.
 */
export function generateMatching(
  filters: FeedFilters,
  count: number,
  options: GenerateMatchingOptions = {},
): Palette[] {
  const { cohesion, attemptsPerPalette = 30 } = options;
  const target: FeedFilters = { ...filters, query: '', onlyIds: null };
  const baseHue =
    filters.hueFamily && HUE_FAMILY_NAMES.includes(filters.hueFamily)
      ? FAMILY_CENTRE[filters.hueFamily]
      : undefined;

  const out: Palette[] = [];
  const budget = count * attemptsPerPalette;

  for (let attempt = 0; out.length < count && attempt < budget; attempt++) {
    const palette = generatePalette({
      size: filters.size ?? undefined,
      // Widen the search as attempts run out, so a narrow filter still resolves.
      baseHue: baseHue === undefined ? undefined : baseHue + ((attempt % 7) - 3) * 9,
      cohesion,
    });
    if (matchesFilters(palette, target)) out.push(palette);
  }

  // Never return nothing: an impossible filter combination still gets palettes.
  while (out.length < count) out.push(generatePalette({ size: filters.size ?? undefined, cohesion }));
  return out;
}


/**
 * Combines feed sources, earliest wins on a duplicate id.
 *
 * Order matters: published palettes come first so their live like counts
 * replace the static numbers baked into the seed file.
 */
export function mergeSources(...lists: Palette[][]): Palette[] {
  const seen = new Set<string>();
  const out: Palette[] = [];
  for (const list of lists) {
    for (const p of list) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}
