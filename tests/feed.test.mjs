import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildFeed, familyWeight, generateMatching, matchesFilters, mergeSources, shuffle, sortFeed,
} from './.build/feed.mjs';
import {
  decodeColors, encodeColors, paletteFromView, paletteHref, parseViewParams,
} from './.build/palette-url.mjs';

const PALETTES = JSON.parse(readFileSync(new URL('../src/lib/data/palettes.json', import.meta.url), 'utf8'));
const NONE = { query: '', moods: [], hueFamily: null, size: null };

test('the curated seed covers every swatch count from 3 to 10', () => {
  const sizes = new Set(PALETTES.map((p) => p.colors.length));
  for (let n = 3; n <= 10; n++) assert.ok(sizes.has(n), `no seed palette has ${n} colours`);
});

test('every seed palette carries the fields the UI reads', () => {
  for (const p of PALETTES) {
    assert.ok(p.id && p.name && p.harmony, `incomplete palette ${p.id}`);
    assert.equal(p.colors.length, p.raw.length);
    assert.ok(p.moods.length >= 1);
    assert.ok(Number.isFinite(Date.parse(p.createdAt)));
    assert.ok(p.likes >= 0);
    for (const hex of p.colors) assert.match(hex, /^#[0-9a-f]{6}$/i);
  }
});

test('seed ids are unique', () => {
  assert.equal(new Set(PALETTES.map((p) => p.id)).size, PALETTES.length);
});

test('size filter is exact', () => {
  for (let n = 3; n <= 10; n++) {
    const out = PALETTES.filter((p) => matchesFilters(p, { ...NONE, size: n }));
    assert.ok(out.length > 0);
    for (const p of out) assert.equal(p.colors.length, n);
  }
});

test('a hex query matches by prefix', () => {
  const target = PALETTES[0].colors[0];
  const out = PALETTES.filter((p) => matchesFilters(p, { ...NONE, query: target.slice(0, 4) }));
  assert.ok(out.some((p) => p.id === PALETTES[0].id));
});

test('a text query matches names, moods and harmonies case-insensitively', () => {
  const p = PALETTES[0];
  assert.ok(matchesFilters(p, { ...NONE, query: p.name.toUpperCase() }));
  assert.ok(matchesFilters(p, { ...NONE, query: p.moods[0].toLowerCase() }));
  assert.ok(matchesFilters(p, { ...NONE, query: p.harmony }));
  assert.ok(!matchesFilters(p, { ...NONE, query: 'zzzzz-no-such-palette' }));
});

test('mood filter is an OR across the selected moods', () => {
  const out = PALETTES.filter((p) => matchesFilters(p, { ...NONE, moods: ['Pastel', 'Cyberpunk'] }));
  assert.ok(out.length > 0);
  for (const p of out) assert.ok(p.moods.includes('Pastel') || p.moods.includes('Cyberpunk'));
});

test('onlyIds restricts the feed to saved palettes', () => {
  const ids = PALETTES.slice(0, 3).map((p) => p.id);
  const out = PALETTES.filter((p) => matchesFilters(p, { ...NONE, onlyIds: ids }));
  assert.deepEqual(out.map((p) => p.id).sort(), [...ids].sort());
  assert.equal(PALETTES.filter((p) => matchesFilters(p, { ...NONE, onlyIds: [] })).length, 0);
});

test('New sorts newest first and Popular sorts by likes', () => {
  const byNew = sortFeed(PALETTES, 'new', 1);
  for (let i = 1; i < byNew.length; i++) {
    assert.ok(Date.parse(byNew[i - 1].createdAt) >= Date.parse(byNew[i].createdAt));
  }
  const byPopular = sortFeed(PALETTES, 'popular', 1);
  for (let i = 1; i < byPopular.length; i++) {
    assert.ok(byPopular[i - 1].likes >= byPopular[i].likes);
  }
});

test('every feed tab returns something to look at', () => {
  for (const tab of ['new', 'popular', 'random', 'harmonized', 'muted', 'vibrant']) {
    const out = buildFeed(PALETTES, NONE, tab, 3);
    assert.ok(out.length > 0, `tab "${tab}" is empty`);
  }
});

test('shuffle is a permutation and is stable for a given key', () => {
  const a = shuffle(PALETTES, 7);
  const b = shuffle(PALETTES, 7);
  assert.deepEqual(a.map((p) => p.id), b.map((p) => p.id));
  assert.notDeepEqual(a.map((p) => p.id), shuffle(PALETTES, 8).map((p) => p.id));
  assert.deepEqual([...a].map((p) => p.id).sort(), PALETTES.map((p) => p.id).sort());
});

test('sorting never invents or drops palettes', () => {
  for (const tab of ['new', 'popular', 'random']) {
    assert.equal(sortFeed(PALETTES, tab, 2).length, PALETTES.length);
  }
});

test('generateMatching respects the size filter', () => {
  for (const n of [3, 7, 10]) {
    const out = generateMatching({ ...NONE, size: n }, 6);
    assert.equal(out.length, 6);
    for (const p of out) assert.equal(p.colors.length, n);
  }
});

test('generateMatching respects mood and hue filters', () => {
  const byMood = generateMatching({ ...NONE, moods: ['Pastel'] }, 5);
  assert.equal(byMood.length, 5);
  assert.ok(byMood.filter((p) => p.moods.includes('Pastel')).length >= 4);

  const byHue = generateMatching({ ...NONE, hueFamily: 'Blue' }, 5);
  assert.equal(byHue.length, 5);
  assert.ok(byHue.filter((p) => matchesFilters(p, { ...NONE, hueFamily: 'Blue' })).length >= 4);
});

test('generateMatching ignores the text query rather than looping forever', () => {
  const out = generateMatching({ ...NONE, query: 'no palette will ever be called this' }, 4);
  assert.equal(out.length, 4);
});

test('generateMatching always returns the requested count, even for impossible filters', () => {
  const out = generateMatching({ ...NONE, moods: ['Cyberpunk'], hueFamily: 'Yellow', size: 3 }, 4);
  assert.equal(out.length, 4);
  for (const p of out) assert.equal(p.colors.length, 3);
});

test('generated palettes are newer than every seed palette', () => {
  const newest = Math.max(...PALETTES.map((p) => Date.parse(p.createdAt)));
  for (const p of generateMatching(NONE, 3)) assert.ok(Date.parse(p.createdAt) >= newest);
});

test('the hue filter returns palettes the hue is actually visible in', () => {
  for (const family of ['Red', 'Orange', 'Yellow', 'Green', 'Teal', 'Blue', 'Purple', 'Pink']) {
    const out = buildFeed(PALETTES, { ...NONE, hueFamily: family }, 'new', 1);
    assert.ok(out.length >= 10, `only ${out.length} palettes for ${family}`);
    // Every match carries a real share of that family...
    for (const p of out) assert.ok(familyWeight(p, family) >= 0.18);
    // ...and the strongest examples come first.
    for (let i = 1; i < out.length; i++) {
      assert.ok(familyWeight(out[i - 1], family) >= familyWeight(out[i], family));
    }
  }
});

test('a palette whose average hue is orange but has no orange swatch is not "Orange"', () => {
  // navy, forest, lavender — the chroma-weighted mean hue lands in the orange arc
  const p = { colors: ['#2e4366', '#39633b', '#9c96d8'], moods: [], harmony: 'random', name: 'x', id: 'x', likes: 0, createdAt: new Date().toISOString(), raw: [], hue: 28, seed: 1 };
  assert.equal(matchesFilters(p, { ...NONE, hueFamily: 'Orange' }), false);
});

test('mergeSources dedupes by id, earliest source wins', () => {
  const remote = [{ ...PALETTES[0], likes: 999 }];
  const local = [PALETTES[0], PALETTES[1]];
  const merged = mergeSources(remote, local);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].likes, 999, 'the published copy must win over the bundled seed');
  assert.equal(merged[1].id, PALETTES[1].id);
});

test('mergeSources keeps every unique palette and preserves order', () => {
  const merged = mergeSources([], PALETTES.slice(0, 5), PALETTES.slice(3, 8));
  assert.deepEqual(merged.map((p) => p.id), PALETTES.slice(0, 8).map((p) => p.id));
  assert.equal(new Set(merged.map((p) => p.id)).size, merged.length);
});

test('palette links round-trip through the URL', () => {
  const colors = ['#553a11', '#00606e', '#9b5644', '#4c94c0'];
  const encoded = encodeColors(colors);
  assert.equal(encoded, '553a11-00606e-9b5644-4c94c0');
  assert.deepEqual(decodeColors(encoded), colors);
});

test('decodeColors rejects anything that is not a palette', () => {
  for (const bad of [null, '', 'nothex-000000', '553a11', 'a-b-c', '#553a11-#00606e']) {
    assert.equal(decodeColors(bad), null, `accepted ${JSON.stringify(bad)}`);
  }
  // A truncated link is the realistic failure — it must not half-render.
  assert.equal(decodeColors('553a11-00606'), null);
});

test('curated palettes link to their prerendered page, others carry their colours', () => {
  assert.equal(paletteHref(PALETTES[0]), `/palette/${PALETTES[0].slug}`);
  assert.match(PALETTES[0].slug, /^[a-z0-9-]+-palette-[a-z0-9]+-\d+$/);

  // No slug means no page was prerendered for it, so the colours travel instead.
  const generated = { ...PALETTES[0], id: 'zz9-4', name: 'Fresh', slug: undefined };
  const href = paletteHref(generated);
  assert.ok(href.startsWith('/palette/view?'));
  const parsed = parseViewParams(href.slice(href.indexOf('?')));
  assert.deepEqual(parsed.colors, generated.colors);
  assert.equal(parsed.name, 'Fresh');
  assert.equal(parsed.id, 'zz9-4');
});

test('a link rebuilds a usable palette with no database', () => {
  const generated = { ...PALETTES[3], id: 'zz1-3', name: 'Linked', slug: undefined };
  const href = paletteHref(generated);
  const rebuilt = paletteFromView(parseViewParams(href.slice(href.indexOf('?'))));
  assert.deepEqual(rebuilt.colors, generated.colors);
  assert.equal(rebuilt.name, 'Linked');
  assert.ok(rebuilt.moods.length >= 1, 'moods are recomputed from the colours');
});


test('every curated palette has a unique name and a unique slug', () => {
  assert.equal(new Set(PALETTES.map((p) => p.name)).size, PALETTES.length, 'duplicate names become duplicate <title> tags');
  assert.equal(new Set(PALETTES.map((p) => p.slug)).size, PALETTES.length);
  for (const p of PALETTES) assert.ok(p.slug.endsWith(p.id), `${p.slug} should end in its id`);
});

test('slugs are URL-safe and carry the name', () => {
  for (const p of PALETTES.slice(0, 40)) {
    assert.match(p.slug, /^[a-z0-9-]+$/, `${p.slug} is not URL-safe`);
    const firstWord = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean)[0];
    assert.ok(p.slug.startsWith(firstWord), `${p.slug} should start with "${firstWord}"`);
  }
});
