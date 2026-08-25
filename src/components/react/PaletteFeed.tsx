import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Plus, Shuffle, SearchX, Sparkles, X } from 'lucide-react';
import FeedControls from './FeedControls';
import PaletteCard from './PaletteCard';
import PaletteModal from './PaletteModal';
import Toaster from './Toaster';
import { buildFeed, generateMatching, matchesFilters, mergeSources } from '@/lib/feed';
import { recohere } from '@/lib/color/palette';
import { ALL_MOODS, HUE_FAMILY_NAMES } from '@/lib/color/naming';
import { FEED_TABS, useAppStore, type FeedTab } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { useHydrated } from '@/lib/useHydrated';
import type { Mood, Palette } from '@/lib/color/types';

const PAGE = 24;
const BATCH = 12;

interface Props {
  /** Saved page passes the bookmark list; the main feed passes nothing. */
  mode?: 'all' | 'saved';
  /** First page, rendered at build time so the HTML is complete without JS. */
  initial?: Palette[];
}

export default function PaletteFeed({ mode = 'all', initial = [] }: Props) {
  const hydrated = useHydrated();
  const tab = useAppStore((s) => s.tab);
  const query = useAppStore((s) => s.query);
  const moods = useAppStore((s) => s.moods);
  const hueFamily = useAppStore((s) => s.hueFamily);
  const size = useAppStore((s) => s.size);
  const shuffleKey = useAppStore((s) => s.shuffleKey);
  const overlay = useAppStore((s) => s.overlay);
  const favorites = useAppStore((s) => s.favorites);
  const reshuffle = useAppStore((s) => s.reshuffle);
  const setTab = useAppStore((s) => s.setTab);

  const setHueFamilyFilter = useAppStore((s) => s.setHueFamily);
  const toggleMoodFilter = useAppStore((s) => s.toggleMood);
  const setSizeFilter = useAppStore((s) => s.setSize);

  const remotePalettes = useRemoteStore((s) => s.palettes);
  const startRemote = useRemoteStore((s) => s.start);

  const [seed, setSeed] = useState<Palette[]>(initial);
  const [extra, setExtra] = useState<Palette[]>([]);
  const [visible, setVisible] = useState(PAGE);
  const [active, setActive] = useState<Palette | null>(null);

  // Dragging the overlay slider re-blends the whole feed; deferring keeps the
  // slider itself at 60fps while the grid catches up.
  const deferredOverlay = useDeferredValue(overlay);

  useEffect(() => startRemote(), [startRemote]);

  // The bundled catalogue is a 236 KB chunk, and with a live database it is
  // redundant: the same palettes arrive over the wire. So it is fetched only
  // as a fallback, when the remote feed is switched off, failed, or came back
  // with less than the first page already in the HTML.
  const remoteStatus = useRemoteStore((s) => s.status);
  useEffect(() => {
    if (seed.length > initial.length) return;
    const remoteIsEnough = remoteStatus === 'ready' && remotePalettes.length > initial.length;
    if (remoteIsEnough) return;
    if (remoteStatus === 'connecting') return;

    let cancelled = false;
    const load = () =>
      import('@/lib/data/palettes').then((mod) => {
        if (!cancelled) setSeed(mod.SEED_PALETTES);
      });

    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200));
    const handle = idle(load);
    return () => {
      cancelled = true;
      window.cancelIdleCallback?.(handle as number);
    };
  }, [remoteStatus, remotePalettes.length, seed.length, initial.length]);

  // A database that never answers must not leave the feed stuck on one page.
  useEffect(() => {
    if (remoteStatus !== 'connecting') return;
    const timer = window.setTimeout(() => {
      if (seed.length <= initial.length) {
        void import('@/lib/data/palettes').then((mod) => setSeed(mod.SEED_PALETTES));
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [remoteStatus, seed.length, initial.length]);

  // Published palettes take priority over the bundled seed so their live like
  // counts win. Freshly generated ones are deliberately NOT merged in here:
  // they would sort to the top of "New" and yank the reader away from the
  // button they just pressed, which sits at the bottom of the page.
  const source = useMemo(() => mergeSources(remotePalettes, seed), [remotePalettes, seed]);

  const cohered = useMemo(() => {
    if (!deferredOverlay.enabled) return source;
    const { enabled: _enabled, ...settings } = deferredOverlay;
    return source.map((p) => recohere(p, settings));
  }, [source, deferredOverlay]);

  const feed = useMemo(
    () =>
      buildFeed(
        cohered,
        {
          query,
          moods,
          hueFamily,
          size,
          onlyIds: mode === 'saved' ? (hydrated ? favorites : []) : null,
        },
        tab,
        shuffleKey,
      ),
    [cohered, query, moods, hueFamily, size, tab, shuffleKey, mode, favorites, hydrated],
  );

  // Deep links (/?hue=Blue, /?mood=Pastel, /?size=5) are read here rather than
  // from Astro.url: these pages are prerendered, so the server sees no query
  // string in a static build and the filter would silently never apply.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const hue = params.get('hue');
    if (hue && HUE_FAMILY_NAMES.includes(hue)) setHueFamilyFilter(hue);

    const mood = params.get('mood');
    if (mood && (ALL_MOODS as string[]).includes(mood)) toggleMoodFilter(mood as Mood);

    const count = Number(params.get('size'));
    if (count >= 3 && count <= 10) setSizeFilter(count);

    const tabParam = params.get('tab');
    if (tabParam && FEED_TABS.some((t) => t.id === tabParam)) setTab(tabParam as FeedTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A changed filter should always show the top of the result set.
  useEffect(() => setVisible(PAGE), [query, moods, hueFamily, size, tab]);

  const generateMore = useCallback(
    (count = BATCH) => {
      const batch = generateMatching(
        { query, moods, hueFamily, size },
        count,
        { cohesion: overlay.enabled ? (({ enabled: _e, ...rest }) => rest)(overlay) : undefined },
      );
      // Appended, not prepended: the newest batch lands closest to the button.
      setExtra((prev) => [...prev, ...batch]);
    },
    [query, moods, hueFamily, size, overlay],
  );

  const shown = feed.slice(0, visible);
  const hasMore = visible < feed.length;

  const published = useMemo(() => new Set(remotePalettes.map((p) => p.id)), [remotePalettes]);
  const generated = useMemo(
    () =>
      extra.filter(
        (p) =>
          !published.has(p.id) &&
          matchesFilters(p, { query, moods, hueFamily, size, onlyIds: null }),
      ),
    [extra, published, query, moods, hueFamily, size],
  );

  return (
    <>
      <FeedControls resultCount={feed.length} />

      {shown.length === 0 ? (
        <EmptyState mode={mode} onGenerate={() => generateMore()} />
      ) : (
        <div className="feed-grid mt-8">
          {shown.map((p) => (
            <PaletteCard key={p.id} palette={p} onOpen={setActive} />
          ))}
        </div>
      )}

      {generated.length > 0 && (
        <section className="mt-12" aria-label="Palettes you just generated">
          <div className="flex items-center gap-2 border-t border-line pt-6">
            <Sparkles className="size-4 text-ink-500" />
            <h2 className="text-[13px] font-semibold text-ink-900">Just generated</h2>
            <span className="text-[11.5px] text-ink-500">
              {generated.length} palette{generated.length === 1 ? '' : 's'}, open one to publish it
            </span>
            <button
              type="button"
              onClick={() => setExtra([])}
              className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-ink-500 transition hover:text-ink-900"
            >
              <X className="size-3" />
              Clear
            </button>
          </div>
          <div className="feed-grid mt-5">
            {generated.map((p) => (
              <PaletteCard key={p.id} palette={p} onOpen={setActive} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="rounded-full border border-line bg-surface px-5 py-2 text-[13px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
          >
            Load more
          </button>
        )}
        {mode === 'all' && (
          <>
            <button
              type="button"
              onClick={() => generateMore()}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-5 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
            >
              <Plus className="size-4" />
              Generate {BATCH} cohesive palettes
            </button>
            <button
              type="button"
              onClick={() => {
                // Only the Random tab is shuffle-ordered, so the button both
                // switches to it and re-rolls — otherwise it silently does
                // nothing on New, Popular and the rest.
                setTab('random');
                reshuffle();
              }}
              aria-label="Shuffle the feed"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
            >
              <Shuffle className="size-4" />
              Shuffle
            </button>
          </>
        )}
      </div>

      <PaletteModal palette={active} onClose={() => setActive(null)} />
      <Toaster />
    </>
  );
}

function EmptyState({ mode, onGenerate }: { mode: 'all' | 'saved'; onGenerate: () => void }) {
  const clearFilters = useAppStore((s) => s.clearFilters);
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <SearchX className="size-8 text-ink-300" strokeWidth={1.5} />
      <p className="text-[15px] font-medium text-ink-900">
        {mode === 'saved' ? 'Nothing saved yet' : 'No palettes match those filters'}
      </p>
      <p className="max-w-sm text-[13px] text-ink-500">
        {mode === 'saved'
          ? 'Tap the bookmark on any palette and it will wait for you here, stored in this browser, no account needed.'
          : 'Loosen a filter, or let the generator build something new that fits.'}
      </p>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink-700 transition hover:border-ink-300"
        >
          Clear filters
        </button>
        {mode === 'all' && (
          <button
            type="button"
            onClick={onGenerate}
            className="rounded-full bg-ink-900 px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
          >
            Generate palettes
          </button>
        )}
      </div>
    </div>
  );
}
