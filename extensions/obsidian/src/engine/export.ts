import { hueFamily } from './naming';
import { readableInk, rgb255, toHslString, toOklch, toOklchString } from './core';
import type { Palette } from './types';

export type ExportFormat =
  | 'css'
  | 'tailwind'
  | 'json'
  | 'scss'
  | 'swift'
  | 'android'
  | 'svg';

export const EXPORT_FORMATS: { id: ExportFormat; label: string; lang: string }[] = [
  { id: 'css', label: 'CSS variables', lang: 'css' },
  { id: 'tailwind', label: 'Tailwind v4', lang: 'css' },
  { id: 'scss', label: 'SCSS', lang: 'scss' },
  { id: 'json', label: 'JSON', lang: 'json' },
  { id: 'swift', label: 'Swift', lang: 'swift' },
  { id: 'android', label: 'Android XML', lang: 'xml' },
  { id: 'svg', label: 'SVG', lang: 'xml' },
];

export function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'palette';
}

/** Names swatches by hue family, de-duplicating with a numeric suffix. */
export function swatchNames(colors: string[]): string[] {
  const seen = new Map<string, number>();
  return colors.map((hex) => {
    const base = hueFamily(toOklch(hex).h).name.toLowerCase();
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${base}-${n}`;
  });
}

export function toCss(p: Palette): string {
  const names = swatchNames(p.colors);
  const lines = p.colors.map(
    (hex, i) => `  --color-${i + 1}: ${hex}; /* ${names[i]} · ${toOklchString(hex)} */`,
  );
  const semantic = p.colors.map((_, i) => `  --color-${names[i]}: var(--color-${i + 1});`);
  return `/* ${p.name}, cohesive palette (${p.harmony}, tint ${p.cohesion.tint} @ ${Math.round(
    p.cohesion.alpha * 100,
  )}%) */\n:root {\n${lines.join('\n')}\n\n${semantic.join('\n')}\n}\n`;
}

export function toTailwind(p: Palette): string {
  const names = swatchNames(p.colors);
  const body = p.colors.map((hex, i) => `  --color-${names[i]}: ${hex};`).join('\n');
  const scale = p.colors.map((hex, i) => `  --color-brand-${(i + 1) * 100}: ${hex};`).join('\n');
  return `/* ${p.name}, Tailwind CSS v4 theme block */\n@theme {\n${body}\n\n${scale}\n}\n`;
}

export function toScss(p: Palette): string {
  const names = swatchNames(p.colors);
  const vars = p.colors.map((hex, i) => `$${names[i]}: ${hex};`).join('\n');
  const map = p.colors.map((_, i) => `  '${names[i]}': $${names[i]},`).join('\n');
  return `// ${p.name}\n${vars}\n\n$palette: (\n${map}\n);\n`;
}

export function toJson(p: Palette): string {
  const names = swatchNames(p.colors);
  return JSON.stringify(
    {
      name: p.name,
      harmony: p.harmony,
      moods: p.moods,
      cohesion: p.cohesion,
      colors: p.colors.map((hex, i) => {
        const [r, g, b] = rgb255(hex);
        return {
          name: names[i],
          hex,
          rgb: { r, g, b },
          hsl: toHslString(hex),
          oklch: toOklchString(hex),
          onColor: readableInk(hex),
        };
      }),
    },
    null,
    2,
  );
}

export function toSwift(p: Palette): string {
  const names = swatchNames(p.colors).map((n) => n.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()));
  const body = p.colors
    .map((hex, i) => {
      const [r, g, b] = rgb255(hex);
      return `    static let ${names[i]} = Color(red: ${(r / 255).toFixed(3)}, green: ${(g / 255).toFixed(
        3,
      )}, blue: ${(b / 255).toFixed(3)}) // ${hex}`;
    })
    .join('\n');
  return `import SwiftUI\n\n// ${p.name}\nextension Color {\n  enum ${pascal(p.name)} {\n${body}\n  }\n}\n`;
}

export function toAndroid(p: Palette): string {
  const names = swatchNames(p.colors).map((n) => n.replace(/-/g, '_'));
  const body = p.colors
    .map((hex, i) => `  <color name="${names[i]}">${hex.toUpperCase()}</color>`)
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>\n<!-- ${p.name} -->\n<resources>\n${body}\n</resources>\n`;
}

function pascal(input: string): string {
  return (
    input
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') || 'Palette'
  );
}

export interface SwatchCardOptions {
  width?: number;
  height?: number;
  showHex?: boolean;
  showName?: boolean;
}

/** Shareable swatch card as standalone SVG markup. */
export function toSvg(p: Palette, options: SwatchCardOptions = {}): string {
  const width = options.width ?? 1200;
  const height = options.height ?? 630;
  const showHex = options.showHex ?? true;
  const showName = options.showName ?? true;
  const footer = showName ? 96 : 0;
  const stripH = height - footer;
  const stripW = width / p.colors.length;

  const strips = p.colors
    .map((hex, i) => {
      const x = i * stripW;
      const label = showHex
        ? `<text x="${x + stripW / 2}" y="${stripH - 34}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${Math.min(
            26,
            stripW / 4.6,
          )}" letter-spacing="1" fill="${readableInk(hex)}" fill-opacity="0.86" text-anchor="middle">${hex.toUpperCase()}</text>`
        : '';
      return `<rect x="${x}" y="0" width="${stripW + 0.5}" height="${stripH}" fill="${hex}"/>${label}`;
    })
    .join('');

  const caption = showName
    ? `<rect x="0" y="${stripH}" width="${width}" height="${footer}" fill="#ffffff"/>` +
      `<text x="48" y="${stripH + 60}" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="600" fill="#16181d">${escapeXml(
        p.name,
      )}</text>` +
      `<text x="${width - 48}" y="${stripH + 60}" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="22" fill="#8a8f98">${p.colors.length} colors · ${escapeXml(
        p.moods.join(' · '),
      )}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
    p.name,
  )} colour palette">${strips}${caption}</svg>`;
}

function escapeXml(input: string): string {
  return input.replace(/[<>&'"]/g, (ch) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[ch]!,
  );
}

export type PinVariant = 'stripes' | 'blocks' | 'hero';

export const PIN_VARIANTS: PinVariant[] = ['stripes', 'blocks', 'hero'];

const FONT = 'Inter, Arial, Helvetica, sans-serif';
const PIN_W = 1000;
const PIN_H = 1500;

const text = (
  x: number,
  y: number,
  value: string,
  { size = 24, weight = 400, fill = '#16181d', anchor = 'start', opacity = 1, spacing = 0 } = {},
) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" ` +
  `fill="${fill}" fill-opacity="${opacity}" text-anchor="${anchor}" letter-spacing="${spacing}">${escapeXml(
    value,
  )}</text>`;

const footer = (dark = false) =>
  text(56, PIN_H - 44, 'Cohesive Colors', { size: 24, weight: 600, fill: dark ? '#ffffff' : '#16181d' }) +
  text(PIN_W - 56, PIN_H - 44, 'harmonised in OKLCH', {
    size: 22,
    fill: dark ? '#ffffff' : '#8a8f98',
    opacity: dark ? 0.6 : 1,
    anchor: 'end',
  });

/** Rows of colour, hex on top — the classic palette pin, works at any count. */
function stripesCard(palette: Palette): string {
  const HEAD = 150;
  const FOOT = 118;
  const body = PIN_H - HEAD - FOOT;
  const rowH = body / palette.colors.length;
  const hexSize = Math.max(24, Math.min(40, rowH * 0.34));

  const rows = palette.colors
    .map((hex, i) => {
      const y = HEAD + i * rowH;
      return (
        `<rect x="0" y="${y}" width="${PIN_W}" height="${rowH + 1}" fill="${hex}"/>` +
        text(56, y + rowH / 2 + hexSize * 0.36, hex.toUpperCase(), {
          size: hexSize,
          weight: 600,
          fill: readableInk(hex),
          opacity: 0.92,
          spacing: 2,
        })
      );
    })
    .join('');

  return (
    `<rect width="${PIN_W}" height="${PIN_H}" fill="#ffffff"/>` +
    text(56, 78, palette.name, { size: 46, weight: 700 }) +
    text(56, 118, `${palette.colors.length} colours · ${palette.moods.join(' · ')}`, {
      size: 24,
      fill: '#8a8f98',
    }) +
    rows +
    footer()
  );
}

/** A two-column grid of tiles — reads differently in a Pinterest feed. */
function blocksCard(palette: Palette): string {
  const HEAD = 210;
  const FOOT = 118;
  const gap = 20;
  const pad = 56;
  const cols = palette.colors.length <= 4 ? 1 : 2;
  const rows = Math.ceil(palette.colors.length / cols);
  const cellW = (PIN_W - pad * 2 - gap * (cols - 1)) / cols;
  const cellH = (PIN_H - HEAD - FOOT - gap * (rows - 1)) / rows;

  const tiles = palette.colors
    .map((hex, i) => {
      const x = pad + (i % cols) * (cellW + gap);
      const y = HEAD + Math.floor(i / cols) * (cellH + gap);
      return (
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="18" fill="${hex}"/>` +
        text(x + 24, y + cellH - 24, hex.toUpperCase(), {
          size: Math.min(30, cellH * 0.3),
          weight: 600,
          fill: readableInk(hex),
          opacity: 0.9,
          spacing: 1.5,
        })
      );
    })
    .join('');

  return (
    `<rect width="${PIN_W}" height="${PIN_H}" fill="#f7f7f8"/>` +
    text(56, 96, palette.name, { size: 52, weight: 700 }) +
    text(56, 142, `${palette.colors.length} colour palette`, { size: 26, fill: '#8a8f98' }) +
    text(56, 178, palette.moods.join(' · ').toUpperCase(), { size: 20, fill: '#8a8f98', spacing: 3 }) +
    tiles +
    footer()
  );
}

/** The palette's darkest colour as a full bleed, the rest as a strip. */
function heroCard(palette: Palette): string {
  const sorted = [...palette.colors].sort((a, b) => toOklch(a).l - toOklch(b).l);
  const ground = sorted[0]!;
  const ink = readableInk(ground);
  const stripH = 260;
  const stripY = PIN_H - 118 - stripH;
  const cellW = PIN_W / palette.colors.length;

  const strip = palette.colors
    .map((hex, i) => `<rect x="${i * cellW}" y="${stripY}" width="${cellW + 1}" height="${stripH}" fill="${hex}"/>`)
    .join('');

  const hexes = palette.colors
    .map((hex, i) =>
      text(i * cellW + cellW / 2, stripY + stripH - 22, hex.replace('#', '').toUpperCase(), {
        size: Math.min(20, cellW / 4.2),
        weight: 600,
        fill: readableInk(hex),
        opacity: 0.85,
        anchor: 'middle',
        spacing: 1,
      }),
    )
    .join('');

  return (
    `<rect width="${PIN_W}" height="${PIN_H}" fill="${ground}"/>` +
    text(56, 300, palette.moods.join(' · ').toUpperCase(), { size: 22, fill: ink, opacity: 0.65, spacing: 4 }) +
    text(56, 400, palette.name, { size: 76, weight: 700, fill: ink }) +
    text(56, 452, `${palette.colors.length} colours · ${palette.harmony}`, {
      size: 26,
      fill: ink,
      opacity: 0.6,
    }) +
    strip +
    hexes +
    footer(readableInk(ground) === '#ffffff')
  );
}

/**
 * A 2:3 vertical card — the shape Pinterest ranks and people actually save.
 *
 * Three layouts of the same palette, because Pinterest treats a repeat of the
 * same image as a duplicate: variants let one page be pinned repeatedly over
 * months without that penalty.
 */
export function toPinCard(palette: Palette, variant: PinVariant = 'stripes'): string {
  const body =
    variant === 'blocks' ? blocksCard(palette) : variant === 'hero' ? heroCard(palette) : stripesCard(palette);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 ${PIN_W} ${PIN_H}" ` +
    `role="img" aria-label="${escapeXml(palette.name)} colour palette">${body}</svg>`
  );
}

export function exportAs(format: ExportFormat, palette: Palette): string {
  switch (format) {
    case 'css': return toCss(palette);
    case 'tailwind': return toTailwind(palette);
    case 'scss': return toScss(palette);
    case 'json': return toJson(palette);
    case 'swift': return toSwift(palette);
    case 'android': return toAndroid(palette);
    case 'svg': return toSvg(palette);
  }
}

export function extensionFor(format: ExportFormat): string {
  return { css: 'css', tailwind: 'css', scss: 'scss', json: 'json', swift: 'swift', android: 'xml', svg: 'svg' }[
    format
  ];
}
