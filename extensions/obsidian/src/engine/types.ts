export interface Oklch {
  mode: 'oklch';
  l: number; // 0..1 perceptual lightness
  c: number; // 0..~0.37 chroma
  h: number; // 0..360 hue
}

export type HarmonyKind =
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'tetradic'
  | 'monochrome'
  | 'random';

export type BlendMode = 'overlay' | 'multiply' | 'screen' | 'soft-light' | 'mix';

export interface CohesionSettings {
  /** Master key colour laid over every swatch. Hex string. */
  tint: string;
  /** Overlay strength, 0..0.5 */
  alpha: number;
  /** How much of each swatch's original lightness is restored after blending, 0..1 */
  preserveLightness: number;
  blend: BlendMode;
  /**
   * Extra perceptual pull of every swatch's hue towards the key colour's hue,
   * 0..1, scaled by alpha. Channel blends such as `overlay` cannot move a fully
   * saturated primary at all, so this is what guarantees a shared hue axis.
   */
  hueBias: number;
  /** Contrast guard: minimum perceptual lightness gap between neighbouring swatches. */
  minDeltaL: number;
  /** Vibrancy guard: target mean chroma the palette is nudged towards. */
  targetChroma: number;
}

export interface GenerateOptions {
  size: number; // 3..10
  harmony: HarmonyKind;
  baseHue?: number;
  lightnessRange?: [number, number];
  chromaRange?: [number, number];
  seed?: number;
  cohesion?: Partial<CohesionSettings>;
  /** Colours the user pinned; index-aligned, null = free slot. */
  locks?: (string | null)[];
}

export type Mood =
  | 'Pastel'
  | 'Vibrant'
  | 'Muted'
  | 'Dark'
  | 'Earthy'
  | 'Nordic'
  | 'Cyberpunk'
  | 'Retro'
  | 'Warm Sunset'
  | 'Monochrome';

export interface Palette {
  id: string;
  name: string;
  /** Final, cohesion-processed swatches as hex. */
  colors: string[];
  /** Pre-cohesion swatches, kept for the before/after toggle. */
  raw: string[];
  harmony: HarmonyKind;
  cohesion: CohesionSettings;
  moods: Mood[];
  /** Dominant hue in degrees, used by the hue filter. */
  hue: number;
  likes: number;
  /** ISO date used for the "New" ordering. */
  createdAt: string;
  /**
   * Present only on curated palettes: the path segment of their prerendered
   * page. Its absence is what marks a palette as runtime-only.
   */
  slug?: string;
  seed: number;
}
