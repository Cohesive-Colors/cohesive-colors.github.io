import { toHslString, toOklchString, toRgbString } from './engine/core';
import type { Palette } from './engine/types';

export type CopyFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';
export type InsertFormat = 'block' | 'list' | 'inline';

/** The language of the fenced block this plugin renders as swatches. */
export const BLOCK_LANGUAGE = 'cohesive-palette';

export const SITE = 'https://cohesive-colors.github.io';

export function formatColor(hex: string, format: CopyFormat): string {
  switch (format) {
    case 'rgb': return toRgbString(hex);
    case 'hsl': return toHslString(hex);
    case 'oklch': return toOklchString(hex);
    default: return hex.toUpperCase();
  }
}

const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi;

/** Expands #abc to #aabbcc and lower-cases, so equal colours compare equal. */
function normaliseHex(hex: string): string {
  const h = hex.slice(1).toLowerCase();
  return h.length === 3 ? `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : `#${h}`;
}

/** Every hex code in a piece of text, in order, duplicates kept. */
export function findHexColors(text: string): string[] {
  return (text.match(HEX) ?? []).map(normaliseHex);
}

export interface ParsedBlock {
  name: string | null;
  colors: string[];
}

/**
 * The block body is forgiving: hex codes anywhere (spaces, commas, one per
 * line), plus an optional name on its own line. So a palette pasted from
 * anywhere renders without reformatting.
 */
export function parseBlock(source: string): ParsedBlock {
  let name: string | null = null;
  const colors: string[] = [];
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const found = findHexColors(line);
    if (found.length > 0) colors.push(...found);
    else if (name === null) name = line.replace(/^name\s*:\s*/i, '');
  }
  return { name, colors };
}

export function blockFor(palette: Pick<Palette, 'name' | 'colors'>): string {
  return ['```' + BLOCK_LANGUAGE, palette.name, palette.colors.join(' '), '```'].join('\n');
}

export function markdownFor(palette: Pick<Palette, 'name' | 'colors'>, format: InsertFormat): string {
  switch (format) {
    case 'list':
      return [`**${palette.name}**`, '', ...palette.colors.map((c) => `- \`${c}\``)].join('\n');
    case 'inline':
      return palette.colors.map((c) => `\`${c}\``).join(' ');
    default:
      return blockFor(palette);
  }
}

/** A link that rebuilds the palette on the site, no database needed. */
export function siteLink(palette: Pick<Palette, 'name' | 'colors'>): string {
  const params = new URLSearchParams({ c: palette.colors.map((c) => c.slice(1)).join('-') });
  if (palette.name) params.set('name', palette.name);
  params.set('ref', 'obsidian');
  return `${SITE}/palette/view?${params.toString()}`;
}
