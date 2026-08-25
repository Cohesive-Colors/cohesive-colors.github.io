import { useEffect, useMemo, useState } from 'react';
import { Layers, SlidersHorizontal } from 'lucide-react';
import ContrastMatrix from './ContrastMatrix';
import ExportPanel from './ExportPanel';
import { Slider } from './CohesionControl';
import { readableInk, toHslString, toOklchString, toRgbString } from '@/lib/color/core';
import { recohere, TINT_SWATCHES } from '@/lib/color/palette';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/store/useToastStore';
import type { CohesionSettings, Palette } from '@/lib/color/types';

type Fmt = 'hex' | 'rgb' | 'hsl' | 'oklch';
const FORMATS: Fmt[] = ['hex', 'rgb', 'hsl', 'oklch'];

export const formatValue = (hex: string, fmt: Fmt) =>
  fmt === 'hex' ? hex.toUpperCase()
  : fmt === 'rgb' ? toRgbString(hex)
  : fmt === 'hsl' ? toHslString(hex)
  : toOklchString(hex);

interface Props {
  palette: Palette;
  /** The modal is cramped; the standalone page can breathe. */
  size?: 'modal' | 'page';
}

/**
 * The palette breakdown itself — swatches, formats, WCAG, exports, and the
 * per-palette cohesion controls. Shared by the modal and the standalone page
 * so the two can never drift apart.
 */
export default function PaletteEditor({ palette, size = 'modal' }: Props) {
  const [fmt, setFmt] = useState<Fmt>('hex');
  const [compare, setCompare] = useState(false);
  const [tab, setTab] = useState<'contrast' | 'export'>('contrast');
  const [settings, setSettings] = useState<CohesionSettings>(palette.cohesion);

  useEffect(() => {
    setSettings(palette.cohesion);
    setCompare(false);
  }, [palette.id]);

  const live = useMemo(() => recohere(palette, settings), [palette, settings]);
  const shown = compare ? palette.raw : live.colors;

  const copyAll = async () => {
    const text = shown.map((c) => formatValue(c, fmt)).join(', ');
    const ok = await copyText(text);
    toast(ok ? `Copied ${shown.length} values` : 'Copy is blocked in this browser', {
      tone: ok ? 'default' : 'error',
    });
  };

  const swatchHeight = size === 'page' ? 'h-[280px] sm:h-[360px]' : 'h-[220px] sm:h-[260px]';
  const pad = size === 'page' ? 'px-0' : 'px-5';

  return (
    <>
      <div className={`flex w-full ${swatchHeight} ${size === 'page' ? 'overflow-hidden rounded-2xl border border-line' : ''}`}>
        {shown.map((hex, i) => (
          <button
            key={`${hex}-${i}`}
            type="button"
            onClick={async () => {
              const value = formatValue(hex, fmt);
              const ok = await copyText(value);
              toast(ok ? `Copied ${value}` : 'Copy is blocked in this browser', {
                swatch: hex,
                tone: ok ? 'default' : 'error',
              });
            }}
            className="group/sw relative flex-1 transition-[flex-grow] duration-300 hover:grow-[1.35]"
            style={{ background: hex }}
            aria-label={`Copy ${formatValue(hex, fmt)}`}
          >
            <span
              className="absolute inset-x-0 bottom-4 px-1 text-center font-mono text-[10.5px] leading-4 tracking-wide"
              style={{ color: readableInk(hex) }}
            >
              <span className="block truncate opacity-85">{formatValue(hex, fmt)}</span>
              <span className="mt-1 block text-[9px] uppercase opacity-0 transition group-hover/sw:opacity-70">
                click to copy
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className={`flex flex-wrap items-center gap-2 py-3 ${pad} ${size === 'modal' ? 'border-b border-line' : ''}`}>
        <div className="flex gap-1">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFmt(f)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium uppercase transition ${
                fmt === f ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={copyAll}
          className="rounded-full border border-line px-3 py-1 text-[11.5px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
        >
          Copy all
        </button>

        <button
          type="button"
          onClick={() => setCompare((v) => !v)}
          aria-pressed={compare}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium transition ${
            compare ? 'border-ink-900 bg-ink-900 text-white' : 'border-line text-ink-700 hover:border-ink-300'
          }`}
        >
          <Layers className="size-3.5" />
          {compare ? 'Showing un-cohesive source' : 'Compare with source'}
        </button>
      </div>

      <div className={`grid gap-6 py-5 lg:grid-cols-[minmax(0,1fr)_260px] ${pad}`}>
        <div>
          <div className="flex gap-1" role="tablist" aria-label="Palette details">
            {(['contrast', 'export'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                  tab === t ? 'bg-canvas text-ink-900' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {t === 'contrast' ? 'Contrast & WCAG' : 'Export'}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {tab === 'contrast' ? (
              <ContrastMatrix colors={shown} />
            ) : (
              <ExportPanel palette={{ ...live, colors: shown }} />
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-line p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-900">
            <SlidersHorizontal className="size-3.5 text-ink-500" />
            Cohesion for this palette
          </p>

          <div className="mt-3 grid grid-cols-6 gap-1.5">
            {TINT_SWATCHES.map((t) => (
              <button
                key={t.hex}
                type="button"
                title={t.name}
                aria-label={`Key colour ${t.name}`}
                onClick={() => setSettings({ ...settings, tint: t.hex })}
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
              onChange={(e) => setSettings({ ...settings, tint: e.target.value })}
              className="size-7 cursor-pointer rounded border border-line bg-transparent p-0"
              aria-label="Custom key colour"
            />
          </label>

          <Slider
            label="Overlay"
            value={settings.alpha}
            min={0}
            max={0.5}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(alpha) => setSettings({ ...settings, alpha })}
          />
          <Slider
            label="Keep lightness"
            value={settings.preserveLightness}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(preserveLightness) => setSettings({ ...settings, preserveLightness })}
          />
          <Slider
            label="Hue pull"
            value={settings.hueBias}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(hueBias) => setSettings({ ...settings, hueBias })}
          />
          <Slider
            label="Min lightness gap"
            value={settings.minDeltaL}
            min={0}
            max={0.12}
            step={0.005}
            format={(v) => v.toFixed(3)}
            onChange={(minDeltaL) => setSettings({ ...settings, minDeltaL })}
          />

          <button
            type="button"
            onClick={() => setSettings(palette.cohesion)}
            className="mt-4 w-full rounded-lg border border-line py-1.5 text-[11.5px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
          >
            Reset to original
          </button>
        </aside>
      </div>
    </>
  );
}
