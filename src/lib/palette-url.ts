import { slug } from '@/lib/color/export';
import { paletteFromColors } from '@/lib/color/palette';
import type { Palette } from '@/lib/color/types';

/**
 * Every palette needs a link, but they come from three places: the curated
 * seed (a real prerendered page), the shared Firebase feed (an id that only
 * exists at runtime), and the generator (never persisted anywhere).
 *
 * So a link is either a path to a prerendered page, or /palette/view carrying
 * enough of the palette in the URL to rebuild it — which also means a
 * generated palette can be shared before it is published, and the recipient
 * needs no database at all.
 */
export const VIEW_ROUTE = '/palette/view';

const HEX = /^[0-9a-f]{6}$/i;

export function encodeColors(colors: string[]): string {
  return colors.map((c) => c.replace('#', '').toLowerCase()).join('-');
}

export function decodeColors(encoded: string | null): string[] | null {
  if (!encoded) return null;
  const parts = encoded.split('-').filter(Boolean);
  if (parts.length < 2 || parts.length > 12) return null;
  if (!parts.every((p) => HEX.test(p))) return null;
  return parts.map((p) => `#${p.toLowerCase()}`);
}

/**
 * Readable slug for a curated palette: the name carries the keywords, the id
 * keeps it unique. The id is never parsed back out, so the two can never
 * disagree; the page receives the palette as a build-time prop.
 */
export function paletteSlug(palette: Palette): string {
  return palette.slug ?? `${slug(palette.name)}-palette-${palette.id}`;
}

/** Curated palettes have a prerendered page; everything else lives at /palette/view. */
export const hasOwnPage = (palette: Palette): boolean => Boolean(palette.slug);

/** The canonical link for a palette. */
export function paletteHref(palette: Palette): string {
  // The slug travels with the palette, so a copy loaded from the database
  // resolves to the same URL as the bundled one.
  if (palette.slug) return `/palette/${palette.slug}`;

  const params = new URLSearchParams({ c: encodeColors(palette.colors) });
  if (palette.name && palette.name !== 'Custom palette') params.set('name', palette.name);
  // Carrying the id lets the page pick up live like counts if it is published,
  // while the colours keep the link working if it is not.
  if (palette.id) params.set('id', palette.id);
  return `${VIEW_ROUTE}?${params}`;
}

export function absoluteHref(palette: Palette, origin: string): string {
  return new URL(paletteHref(palette), origin).href;
}

export interface ParsedView {
  colors: string[] | null;
  name: string | null;
  id: string | null;
}

export function parseViewParams(search: string): ParsedView {
  const params = new URLSearchParams(search);
  const name = params.get('name');
  return {
    colors: decodeColors(params.get('c')),
    name: name && name.length <= 60 ? name : null,
    id: params.get('id'),
  };
}

/** Rebuilds a palette from URL parameters alone. */
export function paletteFromView(parsed: ParsedView): Palette | null {
  if (!parsed.colors) return null;
  return paletteFromColors(parsed.colors, {
    id: parsed.id ?? `url-${encodeColors(parsed.colors).slice(0, 20)}`,
    name: parsed.name ?? 'Shared palette',
  });
}
