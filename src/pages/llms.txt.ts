import type { APIRoute } from 'astro';
import { SEED_PALETTES } from '@/lib/data/palettes';
import { ALL_MOODS, HUE_FAMILY_NAMES } from '@/lib/color/naming';
import { hubHref, PALETTE_SIZES } from '@/lib/seo';
import { paletteSlug } from '@/lib/palette-url';

/**
 * llms.txt: a plain-text map of the site for language models, in the format
 * proposed at llmstxt.org. Listing every palette would be 480 lines of noise,
 * so this describes the structure and the URL patterns instead, and points at
 * the sitemap for the full set.
 */
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('http://localhost:4321')).origin;
  const abs = (path: string) => `${origin}${path}`;
  const examples = SEED_PALETTES.slice(0, 6);

  const body = `# Cohesive Colors

> A collection of ${SEED_PALETTES.length} colour palettes, 3 to 10 swatches each, generated with perceptual OKLCH colour maths. Every palette is run through a shared key colour so its swatches belong together, then repaired by contrast and vibrancy guards. Free to use, no account, no tracking.

Palettes carry hex codes, WCAG 2.1 contrast ratios for every pair, and exports to CSS variables, Tailwind v4, SCSS, JSON, Swift and Android XML.

## How a palette is built

1. Base generation picks a harmony (analogous, complementary, split-complementary, triadic, tetradic, monochrome, or a bounded random set) and lays swatches along an eased lightness ramp.
2. A single key colour is composited over every swatch in linear sRGB, then each swatch is pulled back toward its original OKLab lightness and its hue nudged toward the key hue in OKLCH.
3. Contrast and vibrancy guards push neighbouring swatches apart in lightness and restore chroma, so a heavy overlay cannot flatten the set into mud.

## Browse

- [All palettes](${abs('/palettes')}): paginated index of every palette, newest first
- [Generator](${abs('/generator')}): pin colours and rebuild the rest around them
- [How cohesion works](${abs('/about')}): the colour maths in detail
- [Plugins and apps](${abs('/plugins')}): browser extensions (Chrome, Firefox, Edge), design-tool plugins (Figma, Penpot, Framer, Obsidian) and apps (Android, Windows), with their availability

## By hue

${HUE_FAMILY_NAMES.map((h) => `- [${h} palettes](${abs(hubHref('hue', h))})`).join('\n')}

## By mood

${ALL_MOODS.map((m) => `- [${m} palettes](${abs(hubHref('mood', m))})`).join('\n')}

## By swatch count

${PALETTE_SIZES.map((n) => `- [${n} colour palettes](${abs(hubHref('size', n))})`).join('\n')}

## Example palettes

${examples.map((p) => `- [${p.name}](${abs(`/palette/${paletteSlug(p)}`)}): ${p.colors.join(', ')}`).join('\n')}

## Optional

- [Sitemap](${abs('/sitemap-index.xml')}): every indexable URL
- Palette page URLs follow /palette/{name-slug}-palette-{id}
- A palette can also be encoded entirely in a URL: /palette/view?c=553a11-00606e-9b5644
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
