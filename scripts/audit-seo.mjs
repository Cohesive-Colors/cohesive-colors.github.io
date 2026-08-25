/**
 * Post-build SEO audit. Reads dist/ rather than the source, because what
 * matters is the HTML that actually ships: titles after the brand suffix,
 * links before any JavaScript runs, and whether the sitemap matches reality.
 *
 *   npm run build && npm run audit:seo
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..." and
// resolve() then prefixes the drive a second time.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('No dist/ directory. Run `npm run build` first.');
  process.exit(1);
}

/** Site paths always use forward slashes, whatever the platform uses on disk. */
const toUrl = (file) => `/${relative(dist, dirname(file)).split(sep).filter(Boolean).join('/')}`;

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name === 'index.html') out.push(p);
  }
  return out;
};

const pick = (html, re) => decode((html.match(re) ?? [])[1] ?? '').trim();

const files = walk(dist);
const pages = files.map((file) => {
  const html = readFileSync(file, 'utf8');
  const url = toUrl(file);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    url,
    html,
    title: pick(html, /<title>([^<]*)<\/title>/),
    description: pick(html, /<meta name="description" content="([^"]*)"/),
    canonical: pick(html, /rel="canonical" href="([^"]*)"/),
    h1: (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g) ?? []).map((h) => decode(h.replace(/<[^>]+>/g, '')).trim()),
    jsonld: /application\/ld\+json/.test(html),
    noindex: /name="robots" content="noindex/.test(html),
    words: text ? text.split(' ').length : 0,
    links: new Set((html.match(/href="(\/[^"#?]*)"/g) ?? []).map((h) => h.slice(6, -1).replace(/\/$/, '') || '/')),
  };
});

const byUrl = new Map(pages.map((p) => [p.url === '/' ? '/' : p.url.replace(/\/$/, ''), p]));
const indexable = pages.filter((p) => !p.noindex);
const palettePages = pages.filter((p) => p.url.startsWith('/palette/') && p.url !== '/palette/view');

const duplicates = (values) => {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
};

let problems = 0;
const check = (label, failing, detail = '') => {
  const ok = failing === 0;
  if (!ok) problems++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `: ${detail}` : ''}`);
};

console.log(`\n${pages.length} pages built, ${indexable.length} indexable, ${palettePages.length} palette pages\n`);

console.log('FILES');
check('robots.txt', existsSync(join(dist, 'robots.txt')) ? 0 : 1);
check('sitemap-index.xml', existsSync(join(dist, 'sitemap-index.xml')) ? 0 : 1);
check('llms.txt', existsSync(join(dist, 'llms.txt')) ? 0 : 1);
check('404.html', existsSync(join(dist, '404.html')) ? 0 : 1);

console.log('\nTITLES');
const longTitles = indexable.filter((p) => p.title.length > 60);
const dupTitles = duplicates(indexable.map((p) => p.title));
check('every page has one', indexable.filter((p) => !p.title).length);
check('none over 60 characters', longTitles.length, longTitles.length ? `longest ${Math.max(...indexable.map((p) => p.title.length))}` : '');
check('all unique', dupTitles.length, dupTitles.slice(0, 3).map(([t, n]) => `${n}x "${t}"`).join('; '));

console.log('\nDESCRIPTIONS');
const longDesc = indexable.filter((p) => p.description.length > 160);
const shortDesc = indexable.filter((p) => p.description && p.description.length < 70);
const dupDesc = duplicates(indexable.map((p) => p.description));
check('every page has one', indexable.filter((p) => !p.description).length);
check('none over 160 characters', longDesc.length, `longest ${Math.max(...indexable.map((p) => p.description.length))}`);
check('none under 70 characters', shortDesc.length);
check('all unique', dupDesc.length, dupDesc.slice(0, 2).map(([, n]) => `${n} copies`).join('; '));

console.log('\nSTRUCTURE');
check('exactly one H1', pages.filter((p) => p.h1.length !== 1).length, pages.filter((p) => p.h1.length !== 1).map((p) => p.url).slice(0, 3).join(', '));
check('canonical on every page', pages.filter((p) => !p.canonical).length);
check('structured data on indexable pages', indexable.filter((p) => !p.jsonld).length, indexable.filter((p) => !p.jsonld).map((p) => p.url).slice(0, 4).join(', '));
check('no thin pages under 150 words', indexable.filter((p) => p.words < 150).length, indexable.filter((p) => p.words < 150).map((p) => `${p.url} (${p.words}w)`).slice(0, 3).join(', '));

console.log('\nINTERNAL LINKS (static HTML, before any JavaScript)');
const inbound = new Map(pages.map((p) => [p.url, 0]));
for (const page of pages) {
  for (const link of page.links) {
    if (link !== page.url && inbound.has(link)) inbound.set(link, inbound.get(link) + 1);
  }
}
const orphans = pages.filter((p) => inbound.get(p.url) === 0 && !p.noindex);
const paletteInbound = palettePages.map((p) => inbound.get(p.url)).sort((a, b) => a - b);
check('no indexable page is orphaned', orphans.length, orphans.map((p) => p.url).slice(0, 4).join(', '));
console.log(
  `        palette pages: ${paletteInbound[0]} inbound minimum, ` +
    `${paletteInbound[Math.floor(paletteInbound.length / 2)]} median, ${paletteInbound.at(-1)} maximum`,
);

console.log('\nSITEMAP');
const sitemapFile = join(dist, 'sitemap-0.xml');
if (existsSync(sitemapFile)) {
  const locs = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  const listed = new Set(locs.map((l) => new URL(l).pathname.replace(/\/$/, '') || '/'));
  const missing = indexable.filter((p) => !listed.has(p.url === '/' ? '/' : p.url.replace(/\/$/, '')));
  const dead = [...listed].filter((u) => !byUrl.has(u));
  const noindexed = pages.filter((p) => p.noindex && listed.has(p.url.replace(/\/$/, '')));

  console.log(`        ${locs.length} urls listed`);
  check('every indexable page is listed', missing.length, missing.map((p) => p.url).slice(0, 4).join(', '));
  check('no listed url is missing a page', dead.length, dead.slice(0, 4).join(', '));
  check('no noindex page is listed', noindexed.length, noindexed.map((p) => p.url).join(', '));
} else {
  check('sitemap-0.xml', 1);
}

console.log(
  problems === 0
    ? '\nAll checks passed.\n'
    : `\n${problems} check${problems === 1 ? '' : 's'} failed.\n`,
);
process.exit(problems === 0 ? 0 : 1);
