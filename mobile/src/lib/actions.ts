import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { toast } from '@/store/useToastStore';
import { paletteUrl } from './links';
import type { Palette } from '@/lib/color/types';

export async function copy(value: string, options: { swatch?: string; label?: string } = {}) {
  try {
    await Clipboard.setStringAsync(value);
    void Haptics.selectionAsync();
    toast(options.label ?? `Copied ${value}`, { swatch: options.swatch });
  } catch {
    toast('Could not copy', { tone: 'error' });
  }
}

export const copyHex = (hex: string) => copy(hex.toUpperCase(), { swatch: hex });

export async function sharePalette(palette: Palette) {
  const url = paletteUrl(palette);
  const hexes = palette.colors.map((c) => c.toUpperCase()).join(' ');
  try {
    await Share.share({ title: palette.name, message: `${palette.name}\n${hexes}\n${url}` });
  } catch {
    /* the user closed the sheet */
  }
}

export async function shareText(title: string, message: string) {
  try {
    await Share.share({ title, message });
  } catch {
    /* dismissed */
  }
}
