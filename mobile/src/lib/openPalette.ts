import { router } from 'expo-router';
import { usePaletteRegistry } from '~/store/usePaletteRegistry';
import type { Palette } from '@/lib/color/types';

/** Remembers the palette exactly as shown (overlay included) and opens its screen. */
export function openPalette(palette: Palette) {
  usePaletteRegistry.getState().remember(palette);
  router.push({ pathname: '/palette/[id]', params: { id: palette.id } });
}
