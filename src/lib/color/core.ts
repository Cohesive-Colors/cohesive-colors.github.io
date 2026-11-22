import {
  converter,
  formatHex,
  formatRgb,
  inGamut,
  parse,
  wcagContrast as culoriContrast,
  wcagLuminance,
} from 'culori';
import type { Oklch } from './types';

const oklchConv = converter('oklch');
const oklabConv = converter('oklab');
const rgbConv = converter('rgb');
const lab65 = converter('lab65');

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Shortest-path hue interpolation, degrees. */
export function lerpHue(a: number, b: number, t: number): number {
  let d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

export function toOklch(input: string | Oklch): Oklch {
  if (typeof input !== 'string') return input;
  const parsed = oklchConv(parse(input) ?? '#000000');
  return {
    mode: 'oklch',
    l: parsed?.l ?? 0,
    c: parsed?.c ?? 0,
    h: Number.isFinite(parsed?.h) ? (parsed!.h as number) : 0,
  };
}

const isDisplayable = inGamut('rgb');

/**
 * Binary-search the largest chroma that still fits in sRGB. Cheaper and more
 * predictable than clipping RGB channels, and it never shifts hue.
 */
export function toGamut(color: Oklch): Oklch {
  const base: Oklch = {
    mode: 'oklch',
    l: clamp(color.l, 0, 1),
    c: Math.max(0, color.c),
    h: ((color.h % 360) + 360) % 360,
  };
  if (isDisplayable(base)) return base;
  let lo = 0;
  let hi = base.c;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (isDisplayable({ ...base, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...base, c: lo };
}

export function toHex(color: Oklch | string): string {
  if (typeof color === 'string') return formatHex(parse(color) ?? '#000000') ?? '#000000';
  return formatHex(toGamut(color)) ?? '#000000';
}

export function toRgbString(color: Oklch | string): string {
  const c = typeof color === 'string' ? parse(color) : toGamut(color);
  return formatRgb(rgbConv(c as never)) ?? 'rgb(0 0 0)';
}

export function toOklchString(color: Oklch | string, digits = 3): string {
  const c = typeof color === 'string' ? toOklch(color) : toGamut(color);
  return `oklch(${c.l.toFixed(digits)} ${c.c.toFixed(digits)} ${c.h.toFixed(1)})`;
}

export function toHslString(color: Oklch | string): string {
  const hsl = converter('hsl')(typeof color === 'string' ? parse(color) : toGamut(color));
  if (!hsl) return 'hsl(0 0% 0%)';
  const h = Number.isFinite(hsl.h) ? hsl.h! : 0;
  return `hsl(${h.toFixed(0)} ${(hsl.s * 100).toFixed(1)}% ${(hsl.l * 100).toFixed(1)}%)`;
}

export function toLabString(color: Oklch | string): string {
  const l = lab65(typeof color === 'string' ? parse(color) : toGamut(color));
  if (!l) return 'lab(0 0 0)';
  return `lab(${l.l.toFixed(1)} ${l.a.toFixed(1)} ${l.b.toFixed(1)})`;
}

export function rgb255(color: Oklch | string): [number, number, number] {
  const c = rgbConv(typeof color === 'string' ? parse(color) : toGamut(color));
  return [
    Math.round(clamp(c?.r ?? 0, 0, 1) * 255),
    Math.round(clamp(c?.g ?? 0, 0, 1) * 255),
    Math.round(clamp(c?.b ?? 0, 0, 1) * 255),
  ];
}

export const toOklab = (input: string | Oklch) => oklabConv(typeof input === 'string' ? parse(input) : input)!;
export const fromOklab = (lab: { l: number; a: number; b: number }): Oklch => {
  const c = oklchConv({ mode: 'oklab', ...lab });
  return { mode: 'oklch', l: c.l, c: c.c, h: c.h !== undefined && Number.isFinite(c.h) ? c.h : 0 };
};

/** Linear-light sRGB, the correct space for compositing an overlay layer. */
export function toLinearRgb(input: string | Oklch): [number, number, number] {
  const c = rgbConv(typeof input === 'string' ? parse(input) : toGamut(input))!;
  const lin = (v: number) => {
    const x = clamp(v, 0, 1);
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return [lin(c.r), lin(c.g), lin(c.b)];
}

export function fromLinearRgb([r, g, b]: [number, number, number]): Oklch {
  const gam = (v: number) => {
    const x = clamp(v, 0, 1);
    return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };
  const c = oklchConv({ mode: 'rgb', r: gam(r), g: gam(g), b: gam(b) });
  return { mode: 'oklch', l: c.l, c: c.c, h: c.h !== undefined && Number.isFinite(c.h) ? c.h : 0 };
}

export function luminance(color: Oklch | string): number {
  return wcagLuminance(typeof color === 'string' ? (parse(color) as never) : toGamut(color));
}

export function contrastRatio(a: Oklch | string, b: Oklch | string): number {
  return culoriContrast(
    typeof a === 'string' ? (parse(a) as never) : toGamut(a),
    typeof b === 'string' ? (parse(b) as never) : toGamut(b),
  );
}

/** Best of black / white text on the given background. */
export function readableInk(bg: Oklch | string): '#000000' | '#ffffff' {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#000000') ? '#ffffff' : '#000000';
}

export interface WcagVerdict {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  label: 'AAA' | 'AA' | 'AA Large' | 'Fail';
}

export function wcag(a: Oklch | string, b: Oklch | string): WcagVerdict {
  const ratio = contrastRatio(a, b);
  const aaNormal = ratio >= 4.5;
  const aaLarge = ratio >= 3;
  const aaaNormal = ratio >= 7;
  return {
    ratio,
    aaNormal,
    aaLarge,
    aaaNormal,
    aaaLarge: ratio >= 4.5,
    label: aaaNormal ? 'AAA' : aaNormal ? 'AA' : aaLarge ? 'AA Large' : 'Fail',
  };
}
