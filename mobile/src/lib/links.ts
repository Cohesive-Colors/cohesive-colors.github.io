import { encodeColors } from '@/lib/palette-url';
import type { Palette } from '@/lib/color/types';

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://cohesive-colors.github.io').replace(/\/$/, '');

/**
 * Same links the website produces (see `paletteHref` in src/lib/palette-url.ts):
 * curated palettes have their own page, everything else travels in the query
 * string. Built by hand because React Native's URLSearchParams is incomplete.
 */
export function paletteUrl(palette: Palette): string {
  if (palette.slug) return `${SITE_URL}/palette/${palette.slug}/`;
  const params: string[] = [`c=${encodeColors(palette.colors)}`];
  if (palette.name && palette.name !== 'Custom palette') params.push(`name=${encodeURIComponent(palette.name)}`);
  if (palette.id) params.push(`id=${encodeURIComponent(palette.id)}`);
  return `${SITE_URL}/palette/view?${params.join('&')}`;
}
