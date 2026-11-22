import { useEffect, useState, type ReactNode } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { readableInk, toHslString, toOklchString, toRgbString } from '@/lib/color/core';

export type CopyFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

export function formatColor(hex: string, format: CopyFormat): string {
  switch (format) {
    case 'rgb': return toRgbString(hex);
    case 'hsl': return toHslString(hex);
    case 'oklch': return toOklchString(hex);
    default: return hex.toUpperCase();
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------------ toast */

type ToastMsg = { id: number; text: string; swatch?: string };
let push: ((m: Omit<ToastMsg, 'id'>) => void) | null = null;

export function toast(text: string, swatch?: string) {
  push?.({ text, swatch });
}

export function Toaster() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => {
    push = (m) => setMsg({ ...m, id: Date.now() });
    return () => {
      push = null;
    };
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 1600);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center"
      key={msg.id}
    >
      <div className="flex items-center gap-2 rounded-full bg-ink-900 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
        {msg.swatch && <span className="h-3 w-3 rounded-full ring-1 ring-white/40" style={{ background: msg.swatch }} />}
        {msg.text}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- swatches */

interface SwatchesProps {
  colors: string[];
  format: CopyFormat;
  className?: string;
  /** Large mode shows hex labels on every stripe and lock toggles. */
  large?: boolean;
  locks?: (string | null)[];
  onToggleLock?: (index: number) => void;
}

export function Swatches({ colors, format, className = '', large = false, locks, onToggleLock }: SwatchesProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const copy = async (hex: string) => {
    const value = formatColor(hex, format);
    toast((await copyText(value)) ? `Copied ${value}` : 'Copy is blocked here', hex);
  };

  return (
    <div className={`flex overflow-hidden ${className}`} onMouseLeave={() => setHovered(null)}>
      {colors.map((hex, i) => {
        const ink = readableInk(hex);
        const locked = Boolean(locks?.[i]);
        return (
          <div
            key={`${hex}-${i}`}
            className="swatch relative min-w-0"
            style={{ background: hex, flexGrow: hovered === i ? 1.6 : 1, flexBasis: 0 }}
            onMouseEnter={() => setHovered(i)}
          >
            <button
              type="button"
              onClick={() => void copy(hex)}
              className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-900"
              title={`Copy ${formatColor(hex, format)}`}
              aria-label={`Copy ${formatColor(hex, format)}`}
            />
            {large && onToggleLock && (hovered === i || locked) && (
              <button
                type="button"
                onClick={() => onToggleLock(i)}
                className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full p-1 transition hover:bg-black/10"
                style={{ color: ink }}
                aria-label={locked ? 'Unlock swatch' : 'Lock swatch'}
                title={locked ? 'Unlock' : 'Lock — keeps this colour on Generate'}
              >
                {locked ? <Lock size={13} /> : <LockOpen size={13} />}
              </button>
            )}
            {(large ? colors.length <= 6 || hovered === i : hovered === i) && (
              <span
                className="pointer-events-none absolute inset-x-0 bottom-2 truncate px-0.5 text-center font-mono text-[10px] tracking-wide"
                style={{ color: ink }}
              >
                {hex.replace('#', '').toUpperCase()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- bits */

export function Chip({
  active,
  children,
  onClick,
  title,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className={`h-7 min-w-7 rounded-full px-2 text-xs font-medium transition ${
        active ? 'bg-ink-900 text-white' : 'border border-line bg-surface text-ink-700 hover:border-ink-300'
      }`}
    >
      {children}
    </button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{children}</div>;
}

export const SIZES = [3, 4, 5, 6, 7, 8, 9, 10];
