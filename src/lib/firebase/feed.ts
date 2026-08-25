import { getFirebase } from './client';
import type { Palette } from '@/lib/color/types';

/** How a palette is stored in Realtime Database. */
export interface RemotePalette {
  name: string;
  colors: string[];
  raw: string[];
  harmony: string;
  hue: number;
  moods: string[];
  seed: number;
  cohesion: Palette['cohesion'];
  createdAt: number;
  author: string;
  likes: number;
}

const PALETTE_LIMIT = 400;

/** RTDB returns sparse arrays as objects; normalise both shapes. */
function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (value && typeof value === 'object') return Object.values(value as Record<string, string>);
  return [];
}

function toPalette(id: string, node: Partial<RemotePalette>): Palette | null {
  const colors = list(node.colors);
  if (!colors.length) return null;
  return {
    id,
    name: node.name ?? 'Untitled',
    colors,
    raw: list(node.raw).length === colors.length ? list(node.raw) : colors,
    harmony: (node.harmony ?? 'random') as Palette['harmony'],
    cohesion: node.cohesion as Palette['cohesion'],
    moods: list(node.moods) as Palette['moods'],
    hue: Number(node.hue ?? 0),
    likes: Number(node.likes ?? 0),
    createdAt: new Date(Number(node.createdAt ?? Date.now())).toISOString(),
    seed: Number(node.seed ?? 0),
  };
}

export type Unsubscribe = () => void;

/** Live feed of published palettes, newest first, capped so one read stays small. */
export async function subscribeFeed(
  onData: (palettes: Palette[]) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  const fb = await getFirebase();
  if (!fb) return () => {};

  const { ref, query, orderByChild, limitToLast, onValue, off } = await import('firebase/database');
  const q = query(ref(fb.db, 'palettes'), orderByChild('createdAt'), limitToLast(PALETTE_LIMIT));

  const handler = onValue(
    q,
    (snap) => {
      const out: Palette[] = [];
      snap.forEach((child) => {
        const palette = toPalette(child.key!, child.val() ?? {});
        if (palette) out.push(palette);
      });
      onData(out.reverse());
    },
    (error) => onError?.(error),
  );

  return () => off(q, 'value', handler);
}

/** The ids this browser's anonymous user has liked. */
export async function subscribeMyLikes(onData: (ids: string[]) => void): Promise<Unsubscribe> {
  const fb = await getFirebase();
  if (!fb) return () => {};

  const { ref, onValue, off } = await import('firebase/database');
  const node = ref(fb.db, `userLikes/${fb.uid}`);
  const handler = onValue(node, (snap) => onData(Object.keys(snap.val() ?? {})));
  return () => off(node, 'value', handler);
}

function payload(p: Palette, uid: string, likes: number): RemotePalette {
  return {
    name: p.name.slice(0, 60),
    colors: p.colors,
    raw: p.raw,
    harmony: p.harmony,
    hue: p.hue,
    moods: p.moods,
    seed: p.seed,
    cohesion: p.cohesion,
    createdAt: Date.parse(p.createdAt) || Date.now(),
    author: uid,
    likes,
  };
}

/**
 * Likes and un-likes in a single atomic multi-path update.
 *
 * Both writes land together or not at all, which is what lets the security
 * rules bind them: the counter may only move by one, and only in the direction
 * that matches this user's own like mirror. A palette that is not on the server
 * yet (a seed palette on a fresh database) is created by the same update.
 */
export async function toggleLike(palette: Palette, liked: boolean): Promise<boolean> {
  const fb = await getFirebase();
  if (!fb) return false;

  const { ref, get, child, update, increment } = await import('firebase/database');

  const root = ref(fb.db);
  const exists = (await get(child(root, `palettes/${palette.id}/likes`))).exists();

  const patch: Record<string, unknown> = {
    [`userLikes/${fb.uid}/${palette.id}`]: liked ? true : null,
  };

  if (exists) {
    patch[`palettes/${palette.id}/likes`] = increment(liked ? 1 : -1);
  } else if (liked) {
    // First like of a palette that only existed locally: publish it at 1.
    Object.assign(patch, flatten(`palettes/${palette.id}`, payload(palette, fb.uid, 1)));
  } else {
    return true; // nothing to un-like
  }

  await update(root, patch);
  return true;
}

/** Publishes a generated palette to the shared feed. */
export async function publishPalette(palette: Palette): Promise<boolean> {
  const fb = await getFirebase();
  if (!fb) return false;

  const { ref, get, child, update } = await import('firebase/database');
  const root = ref(fb.db);

  if ((await get(child(root, `palettes/${palette.id}`))).exists()) return true;

  await update(root, {
    ...flatten(`palettes/${palette.id}`, payload(palette, fb.uid, 0)),
    [`lastPublish/${fb.uid}`]: Date.now(),
  });
  return true;
}

/** Multi-path updates need flat "a/b/c" keys, not nested objects. */
function flatten(prefix: string, value: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) out[`${prefix}/${key}`] = v;
  return out;
}
