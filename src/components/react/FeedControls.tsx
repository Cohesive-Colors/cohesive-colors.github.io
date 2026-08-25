import { Search, SlidersHorizontal, X } from 'lucide-react';
import CohesionControl from './CohesionControl';
import { ALL_MOODS, HUE_FAMILY_NAMES } from '@/lib/color/naming';
import { FEED_TABS, useAppStore } from '@/store/useAppStore';

const SIZES = [3, 4, 5, 6, 7, 8, 9, 10];

export default function FeedControls({ resultCount }: { resultCount: number }) {
  const { tab, query, moods, hueFamily, size } = useAppStore();
  const { setTab, setQuery, toggleMood, setHueFamily, setSize, clearFilters, reshuffle } = useAppStore();

  const filtersActive = query !== '' || moods.length > 0 || hueFamily !== null || size !== null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        className="flex flex-wrap items-center justify-center gap-1"
        role="tablist"
        aria-label="Palette feed"
      >
        {FEED_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            title={t.hint}
            onClick={() => {
              setTab(t.id);
              if (t.id === 'random') reshuffle();
            }}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
              tab === t.id
                ? 'bg-ink-900 text-white'
                : 'text-ink-700 hover:bg-white hover:text-ink-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search names, moods or #hex"
            aria-label="Search palettes"
            className="h-9 w-full rounded-full border border-line bg-surface pl-9 pr-3 text-[13px] text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-ink-300"
          />
        </div>

        <select
          value={hueFamily ?? ''}
          onChange={(e) => setHueFamily(e.target.value || null)}
          aria-label="Filter by dominant hue"
          className="h-9 rounded-full border border-line bg-surface px-3 text-[13px] text-ink-700 outline-none transition focus:border-ink-300"
        >
          <option value="">Any hue</option>
          {HUE_FAMILY_NAMES.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <select
          value={size ?? ''}
          onChange={(e) => setSize(e.target.value ? Number(e.target.value) : null)}
          aria-label="Filter by number of colours"
          className="h-9 rounded-full border border-line bg-surface px-3 text-[13px] text-ink-700 outline-none transition focus:border-ink-300"
        >
          <option value="">Any size</option>
          {SIZES.map((n) => (
            <option key={n} value={n}>{n} colors</option>
          ))}
        </select>

        <CohesionControl compact />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {ALL_MOODS.map((mood) => {
          const on = moods.includes(mood);
          return (
            <button
              key={mood}
              type="button"
              aria-pressed={on}
              onClick={() => toggleMood(mood)}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] transition ${
                on
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-line bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-900'
              }`}
            >
              {mood}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 text-[11.5px] text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <SlidersHorizontal className="size-3.5" />
          {resultCount} palette{resultCount === 1 ? '' : 's'}
        </span>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-ink-700 underline-offset-2 hover:underline"
          >
            <X className="size-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
