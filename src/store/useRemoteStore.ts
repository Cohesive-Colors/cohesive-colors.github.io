import { create } from 'zustand';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { publishPalette, subscribeFeed, subscribeMyLikes, toggleLike } from '@/lib/firebase/feed';
import type { Palette } from '@/lib/color/types';

export type RemoteStatus = 'off' | 'connecting' | 'ready' | 'error';

interface RemoteState {
  status: RemoteStatus;
  /** Palettes published by anyone, newest first. */
  palettes: Palette[];
  /** Ids this browser's anonymous user has liked. */
  myLikes: string[];
  /** Optimistic offsets held until the write is acknowledged. */
  deltas: Record<string, number>;
  started: boolean;

  start: () => void;
  like: (palette: Palette, next: boolean) => Promise<void>;
  publish: (palette: Palette) => Promise<'published' | 'off' | 'failed'>;
}

export const useRemoteStore = create<RemoteState>((set, get) => ({
  status: isFirebaseConfigured ? 'connecting' : 'off',
  palettes: [],
  myLikes: [],
  deltas: {},
  started: false,

  start: () => {
    if (get().started || !isFirebaseConfigured) return;
    set({ started: true });

    void subscribeFeed(
      (palettes) => set({ palettes, status: 'ready' }),
      () => set({ status: 'error' }),
    );
    void subscribeMyLikes((myLikes) => set({ myLikes }));
  },

  like: async (palette, next) => {
    const { myLikes, deltas } = get();

    // Move the UI first; the subscription confirms or the catch below reverts.
    set({
      myLikes: next ? [...myLikes, palette.id] : myLikes.filter((id) => id !== palette.id),
      deltas: { ...deltas, [palette.id]: (deltas[palette.id] ?? 0) + (next ? 1 : -1) },
    });

    try {
      const ok = await toggleLike(palette, next);
      if (!ok) throw new Error('offline');
      // The write is acknowledged and the live snapshot now carries it.
      set((s) => {
        const { [palette.id]: _drop, ...rest } = s.deltas;
        return { deltas: rest };
      });
    } catch {
      set((s) => ({
        status: 'error',
        myLikes: next ? s.myLikes.filter((id) => id !== palette.id) : [...s.myLikes, palette.id],
        deltas: (({ [palette.id]: _drop, ...rest }) => rest)(s.deltas),
      }));
      throw new Error('like failed');
    }
  },

  publish: async (palette) => {
    if (!isFirebaseConfigured) return 'off';
    try {
      return (await publishPalette(palette)) ? 'published' : 'failed';
    } catch {
      set({ status: 'error' });
      return 'failed';
    }
  },
}));
