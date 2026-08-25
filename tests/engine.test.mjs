import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePalette,
  cohere,
  toOklch,
  toHex,
  contrastRatio,
  enforceContrast,
  enforceVibrancy,
  recohere,
  exportAs,
  DEFAULT_COHESION,
  makeRng,
  toSvg,
} from './.build/engine.mjs';

const HEX = /^#[0-9a-f]{6}$/i;

test('generated palettes honour the requested size and emit valid sRGB hex', () => {
  for (let size = 3; size <= 10; size++) {
    const p = generatePalette({ size, seed: 1000 + size });
    assert.equal(p.colors.length, size);
    assert.equal(p.raw.length, size);
    for (const hex of p.colors) assert.match(hex, HEX, `${hex} is not a valid hex`);
  }
});

test('the same seed always rebuilds the same palette', () => {
  const a = generatePalette({ seed: 42, size: 6 });
  const b = generatePalette({ seed: 42, size: 6 });
  assert.deepEqual(a.colors, b.colors);
  assert.equal(a.name, b.name);
});

test('contrast guard keeps neighbouring swatches perceptually apart', () => {
  for (let seed = 0; seed < 400; seed++) {
    const p = generatePalette({ seed, size: 3 + (seed % 8) });
    const ls = p.colors.map((h) => toOklch(h).l).sort((x, y) => x - y);
    for (let i = 1; i < ls.length; i++) {
      assert.ok(
        ls[i] - ls[i - 1] >= 0.03,
        `seed ${seed}: swatches ${i - 1}/${i} only ${(ls[i] - ls[i - 1]).toFixed(3)} L apart`,
      );
    }
  }
});

test('no palette is a mud puddle: lightest vs darkest always clears 1.6:1', () => {
  for (let seed = 0; seed < 400; seed++) {
    const p = generatePalette({ seed });
    const sorted = [...p.colors].sort((a, b) => toOklch(a).l - toOklch(b).l);
    const ratio = contrastRatio(sorted[0], sorted[sorted.length - 1]);
    assert.ok(ratio >= 1.6, `seed ${seed}: palette span is only ${ratio.toFixed(2)}:1`);
  }
});

test('a heavy overlay still leaves usable chroma (vibrancy guard)', () => {
  const raw = ['#e63946', '#2a9d8f', '#e9c46a', '#264653'].map(toOklch);
  const { colors } = cohere(raw, { ...DEFAULT_COHESION, alpha: 0.5, tint: '#7d7d7d' });
  const meanC = colors.reduce((s, c) => s + c.c, 0) / colors.length;
  assert.ok(meanC > 0.03, `overlay flattened the palette to ${meanC.toFixed(4)} mean chroma`);
});

test('cohesion pulls swatches towards the key colour\'s hue axis', () => {
  const raw = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(toOklch);
  const tintHue = toOklch('#f39c12').h;
  const meanDistanceToTint = (list) =>
    list.reduce((s, c) => s + Math.abs(((c.h - tintHue + 540) % 360) - 180), 0) / list.length;

  const before = meanDistanceToTint(raw);
  let previous = before;
  for (const alpha of [0.15, 0.3, 0.45]) {
    const after = meanDistanceToTint(cohere(raw, { ...DEFAULT_COHESION, alpha, tint: '#f39c12' }).colors);
    assert.ok(after < previous, `alpha ${alpha}: hues drifted away from the key (${previous.toFixed(1)} -> ${after.toFixed(1)})`);
    previous = after;
  }
  assert.ok(previous < before * 0.85, 'a 45% overlay should visibly tighten the hue axis');
});

test('cohesion keeps swatches distinguishable — it unifies, it does not merge', () => {
  const raw = ['#e63946', '#2a9d8f', '#e9c46a', '#264653'].map(toOklch);
  const { colors } = cohere(raw, { ...DEFAULT_COHESION, alpha: 0.5, tint: '#7d6ba7' });
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const dL = Math.abs(colors[i].l - colors[j].l);
      const dH = Math.abs(((colors[i].h - colors[j].h + 540) % 360) - 180);
      assert.ok(dL > 0.02 || dH > 6, `swatches ${i} and ${j} collapsed into each other`);
    }
  }
});

test('enforceContrast is stable when the palette already has room', () => {
  const input = [0.2, 0.4, 0.6, 0.8].map((l) => ({ mode: 'oklch', l, c: 0.1, h: 30 }));
  const out = enforceContrast(input, 0.05);
  assert.deepEqual(out.map((c) => +c.l.toFixed(3)), [0.2, 0.4, 0.6, 0.8]);
});

test('enforceContrast rescues a flat palette', () => {
  const input = [0.5, 0.505, 0.51, 0.5].map((l) => ({ mode: 'oklch', l, c: 0.08, h: 200 }));
  const out = enforceContrast(input, 0.06).map((c) => c.l).sort((a, b) => a - b);
  for (let i = 1; i < out.length; i++) assert.ok(out[i] - out[i - 1] >= 0.059);
});

test('enforceVibrancy never lowers chroma', () => {
  const input = [{ mode: 'oklch', l: 0.6, c: 0.25, h: 30 }];
  assert.equal(enforceVibrancy(input, 0.08)[0].c, 0.25);
});

test('locked swatches survive generation untouched', () => {
  const p = generatePalette({ size: 5, seed: 7, locks: ['#ff0055', null, '#00d1b2', null, null] });
  assert.equal(p.colors[0].toLowerCase(), '#ff0055');
  assert.equal(p.colors[2].toLowerCase(), '#00d1b2');
});

test('recohere is a pure function of raw + settings', () => {
  const p = generatePalette({ seed: 99, size: 5 });
  const a = recohere(p, { ...p.cohesion, alpha: 0.4 });
  const b = recohere(p, { ...p.cohesion, alpha: 0.4 });
  assert.deepEqual(a.colors, b.colors);
  assert.notDeepEqual(a.colors, p.colors);
});

test('alpha 0 is a no-op apart from the guards', () => {
  const raw = ['#3a86ff', '#8338ec', '#ff006e', '#fb5607'].map(toOklch);
  const { colors } = cohere(raw, { ...DEFAULT_COHESION, alpha: 0, minDeltaL: 0, targetChroma: 0 });
  assert.deepEqual(colors.map(toHex), raw.map(toHex));
});

test('every exporter produces non-empty, format-appropriate output', () => {
  const p = generatePalette({ seed: 5, size: 5 });
  assert.ok(exportAs('css', p).includes('--color-1:'));
  assert.ok(exportAs('tailwind', p).includes('@theme'));
  assert.ok(exportAs('scss', p).startsWith('//'));
  assert.equal(JSON.parse(exportAs('json', p)).colors.length, 5);
  assert.ok(exportAs('swift', p).includes('import SwiftUI'));
  assert.ok(exportAs('android', p).includes('<resources>'));
  assert.ok(exportAs('svg', p).startsWith('<svg'));
});

test('SVG export escapes names and covers the full width', () => {
  const p = generatePalette({ seed: 3, size: 4 });
  const svg = toSvg({ ...p, name: 'A & B <script>' }, { width: 400, height: 200 });
  assert.ok(svg.includes('A &amp; B &lt;script&gt;'));
  assert.ok(!svg.includes('<script>'));
});

test('rng is uniform enough not to bias the feed', () => {
  const rng = makeRng(1234);
  const buckets = new Array(10).fill(0);
  for (let i = 0; i < 20000; i++) buckets[Math.floor(rng() * 10)]++;
  for (const b of buckets) assert.ok(b > 1700 && b < 2300, `bucket skew: ${b}`);
});
