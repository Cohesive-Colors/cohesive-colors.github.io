/**
 * Mobile version of `src/store/useAppStore.ts` (swapped in by metro.config.js
 * and tsconfig paths, so the shared feed code still finds `FeedTab` here).
 *
 * Same state shape as the site, persisted to AsyncStorage instead of
 * localStorage, plus one addition: `saved` keeps the full palette for every
 * bookmark. The site stores ids only, which loses a generated palette that was
 * never published; on a phone the Saved tab has to work offline and forever.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_COHESION } from '@/lib/color/cohesion';
import type { BlendMode, CohesionSettings, Mood, Palette } from '@/lib/color/types';

export type FeedTab = 'new' | 'popular' | 'random' | 'harmonized' | 'muted' | 'vibrant';

export const FEED_TABS: { id: FeedTab; label: string; hint: string }[] = [
  { id: 'new', label: 'New', hint: 'Freshest palettes first' },
  { id: 'popular', label: 'Popular', hint: 'Most liked all time' },
  { id: 'random', label: 'Random', hint: 'Shuffle the whole feed' },
  { id: 'harmonized', label: 'Harmonized', hint: 'Strict analogous, triadic and tetradic sets' },
  { id: 'muted', label: 'Muted', hint: 'Low-chroma, atmospheric palettes' },
  { id: 'vibrant', label: 'Vibrant', hint: 'High chroma held together by one key colour' },
];

export interface OverlayState extends CohesionSettings {
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
  saved: Record<string, Palette>;
  likes: string[];
  shuffleKey: number;
  hydrated: boolean;

  setTab: (tab: FeedTab) => void;
  setQuery: (query: string) => void;
  toggleMood: (mood: Mood) => void;
  setHueFamily: (family: string | null) => void;
  setSize: (size: number | null) => void;
  clearFilters: () => void;

  setOverlay: (patch: Partial<OverlayState>) => void;
  resetOverlay: () => void;

  toggleFavorite: (id: string, palette?: Palette) => void;
  toggleLike: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isLiked: (id: string) => boolean;
  clearSaved: () => void;
  reshuffle: () => void;
}

const DEFAULT_OVERLAY: OverlayState = { ...DEFAULT_COHESION, enabled: false };

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
      saved: {},
      likes: [],
      shuffleKey: 1,
      hydrated: false,

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

      toggleFavorite: (id, palette) =>
        set((s) => {
          const removing = s.favorites.includes(id);
          const saved = { ...s.saved };
          if (removing) delete saved[id];
          else if (palette) saved[id] = { ...palette, createdAt: new Date().toISOString() };
          return { favorites: toggle(s.favorites, id), saved };
        }),
      toggleLike: (id) => set((s) => ({ likes: toggle(s.likes, id) })),
      isFavorite: (id) => get().favorites.includes(id),
      isLiked: (id) => get().likes.includes(id),
      clearSaved: () => set({ favorites: [], saved: {} }),
      reshuffle: () => set((s) => ({ shuffleKey: s.shuffleKey + 1 })),
    }),
    {
      name: 'cohesive-colors:v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ favorites: s.favorites, saved: s.saved, likes: s.likes, overlay: s.overlay }),
      onRehydrateStorage: () => () => useAppStore.setState({ hydrated: true }),
    },
  ),
);

export type { BlendMode };
