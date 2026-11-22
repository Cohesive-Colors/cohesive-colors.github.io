import { useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { toast } from '@/store/useToastStore';
import type { Palette } from '@/lib/color/types';

/**
 * Mobile twin of the site's `useLikes`. With Firebase configured the like is
 * shared (one per anonymous install, counted on the server); without it the
 * like stays on the device on top of the palette's baseline count.
 */
export function useLikes() {
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
    (id: string) => (shared ? myLikes.includes(id) : localLikes.includes(id)),
    [shared, myLikes, localLikes],
  );

  const count = useCallback(
    (palette: Palette) =>
      shared
        ? Math.max(0, palette.likes + (deltas[palette.id] ?? 0))
        : palette.likes + (localLikes.includes(palette.id) ? 1 : 0),
    [shared, deltas, localLikes],
  );

  const toggle = useCallback(
    async (palette: Palette) => {
      const next = !isLiked(palette.id);
      if (next) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  return { isLiked, count, toggle, shared, status };
}
