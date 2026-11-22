import { create } from 'zustand';
import { SEED_BY_ID } from '@/lib/data/palettes';
import type { Palette } from '@/lib/color/types';

/**
 * Every palette the app has shown, by id, so a screen can be opened with just
 * `/palette/<id>`. Seed palettes are always there; generated and remote ones
 * are remembered when they are opened.
 */
interface RegistryState {
  byId: Record<string, Palette>;
  remember: (palette: Palette) => void;
}

export const usePaletteRegistry = create<RegistryState>((set) => ({
  byId: {},
  remember: (palette) => set((s) => ({ byId: { ...s.byId, [palette.id]: palette } })),
}));

export function lookupPalette(id: string, extra: Record<string, Palette> = {}): Palette | null {
  return usePaletteRegistry.getState().byId[id] ?? extra[id] ?? SEED_BY_ID.get(id) ?? null;
}
