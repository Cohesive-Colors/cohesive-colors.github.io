import { ALL_MOODS, HUE_FAMILY_NAMES } from '@/lib/color/naming';
import { slug } from '@/lib/color/export';

export const SITE_NAME = 'Cohesive Colors';

/** Sizes that exist in the curated set. */
export const PALETTE_SIZES = [3, 4, 5, 6, 7, 8, 9, 10];

export type HubKind = 'hue' | 'mood' | 'size';

export function hubHref(kind: HubKind, value: string | number): string {
  return `/palettes/${kind}/${slug(String(value))}`;
}

export const HUB_LINKS = [
  ...HUE_FAMILY_NAMES.map((name) => ({
    kind: 'hue' as const,
    value: name,
    label: `${name} palettes`,
    href: hubHref('hue', name),
  })),
  ...ALL_MOODS.map((name) => ({
    kind: 'mood' as const,
    value: name,
    label: `${name} palettes`,
    href: hubHref('mood', name),
  })),
  ...PALETTE_SIZES.map((n) => ({
    kind: 'size' as const,
    value: n,
    label: `${n} color palettes`,
    href: hubHref('size', n),
  })),
];

const MAX_META = 158;

/**
 * Keeps a description just under Google's ~160 character cut without ending
 * mid-word. Written long and trimmed here, rather than written short.
 */
export function clampMeta(text: string, max = MAX_META): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '), cut.lastIndexOf(' '));
  return `${cut.slice(0, stop > max - 40 ? stop : max - 1).replace(/[,.\s]+$/, '')}.`;
}

/** Title, kept inside the ~60 characters a SERP shows. */
export function clampTitle(text: string, max = 60): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}.`;
}

export const BRAND_SUFFIX = ` | ${SITE_NAME}`;

/**
 * Adds the brand without pushing the line past the cut. When there is no room
 * the brand is dropped rather than the page's own words.
 */
export function withBrand(title: string, max = 60): string {
  const full = `${title}${BRAND_SUFFIX}`;
  if (full.length <= max) return full;
  return title.length <= max ? title : clampTitle(title, max);
}
