import { useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { toast } from '@/store/useToastStore';
import { useHydrated } from '@/lib/useHydrated';
import type { Palette } from '@/lib/color/types';

/**
 * One like API for the whole UI.
 *
 * With Firebase configured, likes are shared: the count comes from the server
 * and one anonymous user can like a palette once. Without it, likes stay in
 * this browser and sit on top of the palette's baseline count — the same
 * behaviour the app had before, so nothing breaks in a local clone.
 */
export function useLikes() {
  const hydrated = useHydrated();

  const localLikes = useAppStore((s) => s.likes);
  const toggleLocal = useAppStore((s) => s.toggleLike);

  const status = useRemoteStore((s) => s.status);
  const myLikes = useRemoteStore((s) => s.myLikes);
  const deltas = useRemoteStore((s) => s.deltas);
  const likeRemote = useRemoteStore((s) => s.like);
  const start = useRemoteStore((s) => s.start);

  useEffect(() => start(), [start]);

  const shared = status !== 'off';

  const isLiked = useCallback(
    (id: string) => (!hydrated ? false : shared ? myLikes.includes(id) : localLikes.includes(id)),
    [hydrated, shared, myLikes, localLikes],
  );

  const count = useCallback(
    (palette: Palette) =>
      shared
        ? Math.max(0, palette.likes + (deltas[palette.id] ?? 0))
        : palette.likes + (hydrated && localLikes.includes(palette.id) ? 1 : 0),
    [shared, deltas, hydrated, localLikes],
  );

  const toggle = useCallback(
    async (palette: Palette) => {
      const next = !isLiked(palette.id);
      if (!shared) {
        toggleLocal(palette.id);
        return;
      }
      try {
        await likeRemote(palette, next);
      } catch {
        toast('Could not save your like, check your connection', { tone: 'error' });
      }
    },
    [isLiked, shared, toggleLocal, likeRemote],
  );

  return { isLiked, count, toggle, shared, status, hydrated };
}
