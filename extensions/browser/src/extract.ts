import { fromOklab, toHex, toOklab } from '@/lib/color/core';
import { makeRng } from '@/lib/color/random';

export interface Sample {
  /** CSS colour as returned by getComputedStyle (rgb/rgba/color()). */
  c: string;
  /** Visual weight: how much of the page this colour covers. */
  w: number;
}

export interface ScanResult {
  samples: Sample[];
  title: string;
  host: string;
}

/**
 * Injected into the active tab with chrome.scripting.executeScript, so it must
 * be completely self-contained: no imports, no closures over module scope.
 * It reads computed styles only — nothing is sent anywhere, the result goes
 * straight back to the popup.
 */
export function scanPage(): ScanResult {
  const MAX_ELEMENTS = 8000;
  const weights = new Map<string, number>();
  const add = (color: string | null | undefined, w: number) => {
    if (!color || w <= 0) return;
    if (color === 'transparent' || color.startsWith('rgba(0, 0, 0, 0)')) return;
    const alpha = /rgba?\([^)]*,\s*([\d.]+)\s*\)$/.exec(color);
    if (alpha && Number(alpha[1]) < 0.5) return;
    weights.set(color, (weights.get(color) ?? 0) + w);
  };

  const vw = window.innerWidth || 1280;
  const vh = window.innerHeight || 800;
  const pageArea = vw * vh;

  // The canvas behind everything: body, then html, else the UA's white.
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  const isClear = (c: string) => c === 'transparent' || c === 'rgba(0, 0, 0, 0)';
  add(!isClear(bodyBg) ? bodyBg : !isClear(htmlBg) ? htmlBg : 'rgb(255, 255, 255)', pageArea * 0.6);

  const all = document.body.querySelectorAll('*');
  const n = Math.min(all.length, MAX_ELEMENTS);
  for (let i = 0; i < n; i++) {
    const el = all[i] as HTMLElement;
    const rect = el.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area < 4) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.2) continue;

    // Area beyond one screen is still the same colour to the eye; cap it.
    const visible = Math.min(area, pageArea);
    add(s.backgroundColor, visible);

    // Text: colour only counts where there is direct text in this element.
    let chars = 0;
    for (const node of el.childNodes) {
      if (node.nodeType === 3) chars += (node.textContent ?? '').trim().length;
    }
    if (chars > 0) {
      const size = parseFloat(s.fontSize) || 14;
      add(s.color, Math.min(chars, 400) * size * size * 0.35);
    }

    const bw = parseFloat(s.borderTopWidth) || 0;
    if (bw > 0) add(s.borderTopColor, (rect.width + rect.height) * 2 * bw);

    if (el instanceof SVGElement) {
      const fill = s.fill;
      if (fill && fill !== 'none' && !fill.startsWith('url')) add(fill, visible * 0.8);
      const stroke = s.stroke;
      if (stroke && stroke !== 'none' && !stroke.startsWith('url')) add(stroke, (rect.width + rect.height) * 2);
    }
  }

  return {
    samples: [...weights].map(([c, w]) => ({ c, w })),
    title: document.title,
    host: location.hostname,
  };
}

interface Point {
  l: number;
  a: number;
  b: number;
  w: number;
}

const dist2 = (p: Point, q: { l: number; a: number; b: number }) =>
  (p.l - q.l) ** 2 + (p.a - q.a) ** 2 + (p.b - q.b) ** 2;

/** Colours closer than this in OKLab read as the same colour on screen. */
const SAME = 0.035 ** 2;

function toPoints(samples: Sample[]): Point[] {
  const points: Point[] = [];
  for (const s of samples) {
    let lab: { l: number; a: number; b: number };
    try {
      lab = toOklab(s.c);
      if (!Number.isFinite(lab.l)) continue;
    } catch {
      continue;
    }
    const chroma = Math.hypot(lab.a, lab.b);
    // Accents are small on the page but carry its identity, and greys are
    // large but say little. Compress area and boost colourfulness so a brand
    // colour survives against a white page with dark text.
    const w = Math.sqrt(s.w) * (1 + chroma * 14);
    const twin = points.find((p) => dist2(p, lab) < SAME);
    if (twin) {
      const t = w / (twin.w + w);
      twin.l += (lab.l - twin.l) * t;
      twin.a += (lab.a - twin.a) * t;
      twin.b += (lab.b - twin.b) * t;
      twin.w += w;
    } else {
      points.push({ l: lab.l, a: lab.a, b: lab.b, w });
    }
  }
  return points;
}

/** Number of visually distinct colours found — the upper bound for `k`. */
export function distinctCount(samples: Sample[]): number {
  return toPoints(samples).length;
}

/**
 * Weighted k-means in OKLab with deterministic k-means++ seeding, so the same
 * page always gives the same palette. Returns hex colours, lightest first.
 */
export function clusterColors(samples: Sample[], k: number, seed = 7): string[] {
  const points = toPoints(samples).sort((p, q) => q.w - p.w);
  if (points.length === 0) return [];
  k = Math.max(1, Math.min(k, points.length));
  if (points.length === k) return finish(points);

  const rng = makeRng(seed);
  const centres: { l: number; a: number; b: number }[] = [{ ...points[0]! }];
  while (centres.length < k) {
    const d = points.map((p) => p.w * Math.min(...centres.map((c) => dist2(p, c))));
    const total = d.reduce((s, x) => s + x, 0);
    if (total === 0) break;
    let r = rng() * total;
    let idx = 0;
    while (idx < d.length - 1 && (r -= d[idx]!) > 0) idx++;
    centres.push({ ...points[idx]! });
  }

  const assign = new Array<number>(points.length).fill(0);
  for (let iter = 0; iter < 24; iter++) {
    let moved = false;
    points.forEach((p, i) => {
      let best = 0;
      let bestD = Infinity;
      centres.forEach((c, j) => {
        const dd = dist2(p, c);
        if (dd < bestD) {
          bestD = dd;
          best = j;
        }
      });
      if (assign[i] !== best) moved = true;
      assign[i] = best;
    });
    centres.forEach((c, j) => {
      let w = 0, l = 0, a = 0, b = 0;
      points.forEach((p, i) => {
        if (assign[i] !== j) return;
        w += p.w; l += p.l * p.w; a += p.a * p.w; b += p.b * p.w;
      });
      if (w > 0) Object.assign(c, { l: l / w, a: a / w, b: b / w });
    });
    if (!moved && iter > 0) break;
  }

  // Snap each centre to the heaviest real colour in its cluster: an averaged
  // centre is a colour the page never actually used.
  const snapped = centres.map((c, j) => {
    let best: Point | null = null;
    points.forEach((p, i) => {
      if (assign[i] !== j) return;
      const score = p.w / (1 + 40 * dist2(p, c));
      if (!best || score > best.w / (1 + 40 * dist2(best, c))) best = p;
    });
    return best ?? { ...c, w: 0 };
  });
  return finish(snapped);
}

function finish(points: { l: number; a: number; b: number }[]): string[] {
  const hexes = points
    .slice()
    .sort((p, q) => q.l - p.l)
    .map((p) => toHex(fromOklab(p)));
  return [...new Set(hexes)];
}
