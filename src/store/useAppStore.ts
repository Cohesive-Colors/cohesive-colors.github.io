import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_COHESION } from '@/lib/color/cohesion';
import type { BlendMode, CohesionSettings, Mood } from '@/lib/color/types';

export type FeedTab = 'new' | 'popular' | 'random' | 'harmonized' | 'muted' | 'vibrant';

export const FEED_TABS: { id: FeedTab; label: string; hint: string }[] = [
  { id: 'new', label: 'New', hint: 'Freshest palettes first' },
  { id: 'popular', label: 'Popular', hint: 'Most liked all time' },
  { id: 'random', label: 'Random', hint: 'Shuffle the whole feed' },
  { id: 'harmonized', label: 'Harmonized', hint: 'Strict analogous, triadic and tetradic sets' },
  { id: 'muted', label: 'Muted Moods', hint: 'Low-chroma, atmospheric palettes' },
  { id: 'vibrant', label: 'Vibrant Cohesive', hint: 'High chroma held together by one key colour' },
];

export interface OverlayState extends CohesionSettings {
  /** When off, the feed shows each palette with its own stored cohesion. */
  enabled: boolean;
}

interface AppState {
  tab: FeedTab;
  query: string;
  moods: Mood[];
  hueFamily: string | null;
  size: number | null;
  overlay: OverlayState;
  favorites: string[];
  likes: string[];
  shuffleKey: number;

  setTab: (tab: FeedTab) => void;
  setQuery: (query: string) => void;
  toggleMood: (mood: Mood) => void;
  setHueFamily: (family: string | null) => void;
  setSize: (size: number | null) => void;
  clearFilters: () => void;

  setOverlay: (patch: Partial<OverlayState>) => void;
  resetOverlay: () => void;

  toggleFavorite: (id: string) => void;
  toggleLike: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isLiked: (id: string) => boolean;
  reshuffle: () => void;
}

const DEFAULT_OVERLAY: OverlayState = { ...DEFAULT_COHESION, enabled: false };

/** localStorage is not there during SSR, and can throw in private mode. */
const safeStorage = createJSONStorage(() => {
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  try {
    window.localStorage.getItem('__probe__');
    return window.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
    };
  }
});

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tab: 'new',
      query: '',
      moods: [],
      hueFamily: null,
      size: null,
      overlay: DEFAULT_OVERLAY,
      favorites: [],
      likes: [],
      shuffleKey: 1,

      setTab: (tab) => set({ tab }),
      setQuery: (query) => set({ query }),
      toggleMood: (mood) =>
        set((s) => ({
          moods: s.moods.includes(mood) ? s.moods.filter((m) => m !== mood) : [...s.moods, mood],
        })),
      setHueFamily: (hueFamily) => set({ hueFamily }),
      setSize: (size) => set({ size }),
      clearFilters: () => set({ query: '', moods: [], hueFamily: null, size: null }),

      setOverlay: (patch) => set((s) => ({ overlay: { ...s.overlay, ...patch } })),
      resetOverlay: () => set({ overlay: DEFAULT_OVERLAY }),

      toggleFavorite: (id) => set((s) => ({ favorites: toggle(s.favorites, id) })),
      toggleLike: (id) => set((s) => ({ likes: toggle(s.likes, id) })),
      isFavorite: (id) => get().favorites.includes(id),
      isLiked: (id) => get().likes.includes(id),
      reshuffle: () => set((s) => ({ shuffleKey: s.shuffleKey + 1 })),
    }),
    {
      name: 'cohesive-colors:v1',
      storage: safeStorage,
      // Filters are per-visit; only the durable bits are persisted.
      partialize: (s) => ({ favorites: s.favorites, likes: s.likes, overlay: s.overlay }),
    },
  ),
);

export type { BlendMode };
