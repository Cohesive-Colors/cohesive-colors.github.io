import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bookmark, Copy, Expand, Lock, Minus, Plus, Space, Unlock, UploadCloud,
} from 'lucide-react';
import PaletteModal from './PaletteModal';
import Toaster from './Toaster';
import { Slider } from './CohesionControl';
import { generatePalette, resolveCohesion, TINT_SWATCHES } from '@/lib/color/palette';
import { HARMONIES } from '@/lib/color/harmony';
import { readableInk } from '@/lib/color/core';
import { randomSeed } from '@/lib/color/random';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/store/useToastStore';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import type { CohesionSettings, HarmonyKind } from '@/lib/color/types';

const MIN = 3;
const MAX = 10;

export default function GeneratorStudio() {
  const [seed, setSeed] = useState(() => 1);
  const [size, setSize] = useState(5);
  const [harmony, setHarmony] = useState<HarmonyKind | 'auto'>('auto');
  const [settings, setSettings] = useState<CohesionSettings>(() => resolveCohesion());
  const [locks, setLocks] = useState<(string | null)[]>(() => Array(5).fill(null));
  const [open, setOpen] = useState(false);

  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const remoteStatus = useRemoteStore((s) => s.status);
  const startRemote = useRemoteStore((s) => s.start);
  const publish = useRemoteStore((s) => s.publish);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => startRemote(), [startRemote]);

  // Deep-link support: /generator?seed=…&size=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSeed = Number(params.get('seed'));
    const urlSize = Number(params.get('size'));
    const nextSize = urlSize >= MIN && urlSize <= MAX ? urlSize : 5;
    setSize(nextSize);
    setLocks(Array(nextSize).fill(null));
    setSeed(Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : randomSeed());
  }, []);

  const palette = useMemo(
    () =>
      generatePalette({
        seed,
        size,
        harmony: harmony === 'auto' ? undefined : harmony,
        cohesion: settings,
        locks,
      }),
    [seed, size, harmony, settings, locks],
  );

  const regenerate = useCallback(() => setSeed(randomSeed()), []);

  // Spacebar regenerates everything that is not pinned.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (typing || open) return;
      e.preventDefault();
      regenerate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [regenerate, open]);

  const resize = (next: number) => {
    const clamped = Math.min(MAX, Math.max(MIN, next));
    setSize(clamped);
    setLocks((prev) => {
      const out = prev.slice(0, clamped);
      while (out.length < clamped) out.push(null);
      return out;
    });
  };

  const toggleLock = (index: number) =>
    setLocks((prev) => prev.map((v, i) => (i === index ? (v ? null : palette.colors[index]!) : v)));

  const setLockColor = (index: number, hex: string) =>
    setLocks((prev) => prev.map((v, i) => (i === index ? hex : v)));

  const lockedCount = locks.filter(Boolean).length;

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <section className="flex-1">
          <div className="flex h-[300px] overflow-hidden rounded-2xl border border-line sm:h-[420px]">
            {palette.colors.map((hex, i) => {
              const ink = readableInk(hex);
              const locked = Boolean(locks[i]);
              return (
                <div
                  key={i}
                  className="group relative flex-1 transition-[flex-grow] duration-300 hover:grow-[1.25]"
                  style={{ background: hex }}
                >
                  <div
                    className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-2"
                    style={{ color: ink }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleLock(i)}
                      aria-pressed={locked}
                      aria-label={locked ? `Unlock swatch ${i + 1}` : `Lock swatch ${i + 1}`}
                      className={`grid size-8 place-items-center rounded-full transition ${
                        locked ? 'bg-black/15 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:bg-black/10'
                      }`}
                    >
                      {locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyText(hex.toUpperCase());
                        toast(ok ? `Copied ${hex.toUpperCase()}` : 'Copy is blocked', {
                          swatch: hex,
                          tone: ok ? 'default' : 'error',
                        });
                      }}
                      className="font-mono text-[11px] tracking-wide opacity-80 transition hover:opacity-100"
                      aria-label={`Copy ${hex}`}
                    >
                      {hex.slice(1).toUpperCase()}
                    </button>

                    <label
                      className="cursor-pointer opacity-0 transition group-hover:opacity-70 hover:!opacity-100"
                      title="Pin an exact colour"
                    >
                      <input
                        type="color"
                        value={hex}
                        onChange={(e) => setLockColor(i, e.target.value)}
                        className="sr-only"
                        aria-label={`Pick an exact colour for swatch ${i + 1}`}
                      />
                      <span className="text-[9.5px] uppercase tracking-wide">edit</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
            >
              <Space className="size-4" />
              Generate, press space
            </button>

            <div className="inline-flex items-center rounded-full border border-line bg-surface">
              <button
                type="button"
                onClick={() => resize(size - 1)}
                disabled={size <= MIN}
                aria-label="Remove a colour"
                className="grid size-9 place-items-center rounded-l-full text-ink-700 transition hover:text-ink-900 disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-[74px] text-center text-[12.5px] font-medium tabular-nums text-ink-900">
                {size} colors
              </span>
              <button
                type="button"
                onClick={() => resize(size + 1)}
                disabled={size >= MAX}
                aria-label="Add a colour"
                className="grid size-9 place-items-center rounded-r-full text-ink-700 transition hover:text-ink-900 disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <select
              value={harmony}
              onChange={(e) => setHarmony(e.target.value as HarmonyKind | 'auto')}
              aria-label="Harmony"
              className="h-9 rounded-full border border-line bg-surface px-3 text-[13px] text-ink-700 outline-none focus:border-ink-300"
            >
              <option value="auto">Auto harmony</option>
              {HARMONIES.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={async () => {
                const ok = await copyText(palette.colors.join(', ').toUpperCase());
                toast(ok ? 'Copied all swatches' : 'Copy is blocked', { tone: ok ? 'default' : 'error' });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
            >
              <Copy className="size-3.5" />
              Copy all
            </button>

            <button
              type="button"
              onClick={() => {
                toggleFavorite(palette.id);
                toast('Saved to your browser');
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
            >
              <Bookmark className="size-3.5" />
              Save
            </button>

            {remoteStatus !== 'off' && (
              <button
                type="button"
                disabled={publishing}
                onClick={async () => {
                  setPublishing(true);
                  const result = await publish(palette);
                  setPublishing(false);
                  toast(
                    result === 'published'
                      ? 'Published, it is in the shared feed now'
                      : 'Could not publish, check your connection',
                    { tone: result === 'published' ? 'default' : 'error' },
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900 disabled:opacity-50"
              >
                <UploadCloud className="size-3.5" />
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
            >
              <Expand className="size-3.5" />
              Export & contrast
            </button>

            <span className="ml-auto text-[11.5px] text-ink-500">
              {lockedCount ? `${lockedCount} pinned, space rebuilds the rest around them` : 'Nothing pinned yet'}
            </span>
          </div>
        </section>

        <aside className="w-full shrink-0 rounded-2xl border border-line bg-surface p-4 lg:w-[300px]">
          <p className="text-[12.5px] font-semibold text-ink-900">Cohesion overlay</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">
            One key colour laid over every swatch. Drag it warm or cool and the whole set changes mood
            without losing its contrast ladder.
          </p>

          <div className="mt-3 grid grid-cols-6 gap-1.5">
            {TINT_SWATCHES.map((t) => (
              <button
                key={t.hex}
                type="button"
                title={t.name}
                aria-label={`Key colour ${t.name}`}
                onClick={() => setSettings((s) => ({ ...s, tint: t.hex }))}
                className={`aspect-square rounded-md ring-1 ring-inset ring-black/10 transition hover:scale-105 ${
                  settings.tint.toLowerCase() === t.hex.toLowerCase()
                    ? 'outline outline-2 outline-offset-1 outline-ink-900'
                    : ''
                }`}
                style={{ background: t.hex }}
              />
            ))}
          </div>

          <label className="mt-3 flex items-center justify-between text-[11px] text-ink-500">
            Custom key colour
            <input
              type="color"
              value={settings.tint}
              onChange={(e) => setSettings((s) => ({ ...s, tint: e.target.value }))}
              className="size-7 cursor-pointer rounded border border-line bg-transparent p-0"
              aria-label="Custom key colour"
            />
          </label>

          <Slider
            label="Overlay strength"
            value={settings.alpha}
            min={0}
            max={0.5}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(alpha) => setSettings((s) => ({ ...s, alpha }))}
          />
          <Slider
            label="Keep lightness"
            value={settings.preserveLightness}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(preserveLightness) => setSettings((s) => ({ ...s, preserveLightness }))}
          />
          <Slider
            label="Hue pull"
            value={settings.hueBias}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(hueBias) => setSettings((s) => ({ ...s, hueBias }))}
          />
          <Slider
            label="Vibrancy floor"
            value={settings.targetChroma}
            min={0}
            max={0.2}
            step={0.005}
            format={(v) => v.toFixed(3)}
            onChange={(targetChroma) => setSettings((s) => ({ ...s, targetChroma }))}
          />

          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-[11px] text-ink-500">
            <div className="flex justify-between">
              <dt>Harmony</dt>
              <dd className="text-ink-900">{palette.harmony}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Mood</dt>
              <dd className="text-ink-900">{palette.moods.join(', ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Seed</dt>
              <dd className="font-mono text-ink-900">{palette.seed}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <PaletteModal palette={open ? palette : null} onClose={() => setOpen(false)} />
      <Toaster />
    </>
  );
}
