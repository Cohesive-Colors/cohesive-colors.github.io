import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Droplets, RotateCcw } from 'lucide-react';
import { TINT_SWATCHES } from '@/lib/color/palette';
import { useAppStore } from '@/store/useAppStore';
import { useHydrated } from '@/lib/useHydrated';
import type { BlendMode } from '@/lib/color/types';

const BLENDS: { id: BlendMode; label: string }[] = [
  { id: 'overlay', label: 'Overlay' },
  { id: 'soft-light', label: 'Soft light' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'screen', label: 'Screen' },
  { id: 'mix', label: 'Mix' },
];

interface Props {
  compact?: boolean;
}

/**
 * The global cohesion controller: one key colour and one overlay strength,
 * re-applied to every palette in the feed as you drag.
 */
export default function CohesionControl({ compact = false }: Props) {
  const hydrated = useHydrated();
  const overlay = useAppStore((s) => s.overlay);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const resetOverlay = useAppStore((s) => s.resetOverlay);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = hydrated && overlay.enabled;

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition ${
          active
            ? 'border-ink-900 bg-ink-900 text-white'
            : 'border-line bg-surface text-ink-700 hover:border-ink-300'
        }`}
      >
        <span
          className="size-4 rounded-full ring-1 ring-black/10"
          style={{ background: overlay.tint }}
          aria-hidden
        />
        {compact ? 'Cohesion' : 'Cohesion overlay'}
        {active && <span className="tabular-nums opacity-80">{Math.round(overlay.alpha * 100)}%</span>}
        <ChevronDown className={`size-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Cohesion overlay settings"
          className="absolute right-0 z-50 mt-2 w-[320px] rounded-2xl border border-line bg-surface p-4 shadow-[0_24px_60px_-20px_rgba(20,22,28,0.35)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
              <Droplets className="size-4 text-ink-500" />
              Apply across the feed
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={overlay.enabled}
              onClick={() => setOverlay({ enabled: !overlay.enabled })}
              className={`relative h-5 w-9 rounded-full transition ${
                overlay.enabled ? 'bg-ink-900' : 'bg-ink-300'
              }`}
            >
              <span
                className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                  overlay.enabled ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
            Every palette is re-blended with this key colour in OKLab, then its original lightness is
            restored so contrast survives.
          </p>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-ink-500">
              <span>Tint colour</span>
              <label className="flex cursor-pointer items-center gap-1.5 normal-case tracking-normal text-ink-700">
                Custom
                <input
                  type="color"
                  value={overlay.tint}
                  onChange={(e) => setOverlay({ tint: e.target.value, enabled: true })}
                  className="size-6 cursor-pointer rounded border border-line bg-transparent p-0"
                  aria-label="Custom tint colour"
                />
              </label>
            </div>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {TINT_SWATCHES.map((t) => (
                <button
                  key={t.hex}
                  type="button"
                  title={t.name}
                  onClick={() => setOverlay({ tint: t.hex, enabled: true })}
                  className="relative grid aspect-square place-items-center rounded-lg ring-1 ring-inset ring-black/10 transition hover:scale-105"
                  style={{ background: t.hex }}
                  aria-label={`Use ${t.name} as the key colour`}
                >
                  {overlay.tint.toLowerCase() === t.hex.toLowerCase() && (
                    <Check className="size-3.5 text-white mix-blend-difference" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="Overlay strength"
            value={overlay.alpha}
            min={0}
            max={0.5}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(alpha) => setOverlay({ alpha, enabled: true })}
          />

          <Slider
            label="Keep original lightness"
            value={overlay.preserveLightness}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(preserveLightness) => setOverlay({ preserveLightness, enabled: true })}
          />

          <Slider
            label="Hue pull"
            value={overlay.hueBias}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(hueBias) => setOverlay({ hueBias, enabled: true })}
          />

          <div className="mt-4">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Blend mode</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BLENDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setOverlay({ blend: b.id, enabled: true })}
                  className={`rounded-full border px-2.5 py-1 text-[11.5px] transition ${
                    overlay.blend === b.id
                      ? 'border-ink-900 bg-ink-900 text-white'
                      : 'border-line text-ink-700 hover:border-ink-300'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={resetOverlay}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[12px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
          >
            <RotateCcw className="size-3.5" />
            Reset to each palette's own key
          </button>
        </div>
      )}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

export function Slider({ label, value, min, max, step, format, onChange }: SliderProps) {
  return (
    <label className="mt-4 block">
      <span className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-ink-500">
        {label}
        <span className="tabular-nums normal-case tracking-normal text-ink-900">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-ink-900"
      />
    </label>
  );
}
