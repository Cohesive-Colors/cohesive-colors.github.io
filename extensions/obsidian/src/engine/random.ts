/** Deterministic 32-bit PRNG (mulberry32) so a seed always rebuilds the same palette. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof makeRng>;

export const rand = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
export const randInt = (rng: Rng, min: number, max: number) =>
  Math.floor(rand(rng, min, max + 1 - Number.EPSILON));
export const pick = <T>(rng: Rng, list: readonly T[]): T => list[randInt(rng, 0, list.length - 1)]!;
export const randomSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;
