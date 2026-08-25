import { useState } from 'react';
import { readableInk } from '@/lib/color/core';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/store/useToastStore';

export type CopyFormat = 'hex' | 'rgb' | 'oklch';

interface Props {
  colors: string[];
  /** Value copied per swatch, index-aligned with `colors`. */
  values?: string[];
  format?: CopyFormat;
  showLabels?: boolean;
  rounded?: boolean;
  className?: string;
  onCopied?: (index: number) => void;
}

export default function SwatchStrip({
  colors,
  values,
  showLabels = true,
  rounded = false,
  className = '',
  onCopied,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const copy = async (index: number) => {
    const value = values?.[index] ?? colors[index]!;
    const ok = await copyText(value);
    if (ok) {
      toast(`Copied ${value}`, { swatch: colors[index] });
      onCopied?.(index);
    } else {
      toast('Copy is blocked in this browser', { tone: 'error' });
    }
  };

  return (
    <div className={`flex h-full w-full ${className}`} onMouseLeave={() => setHovered(null)}>
      {colors.map((hex, i) => (
        <button
          key={`${hex}-${i}`}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onFocus={() => setHovered(i)}
          onClick={(e) => {
            e.stopPropagation();
            void copy(i);
          }}
          title={`Copy ${values?.[i] ?? hex}`}
          aria-label={`Copy ${values?.[i] ?? hex}`}
          className={`swatch-strip relative h-full min-w-0 cursor-pointer outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-inset ${
            rounded ? 'first:rounded-l-[10px] last:rounded-r-[10px]' : ''
          }`}
          style={{
            background: hex,
            flexGrow: hovered === i ? 1.5 : 1,
            flexBasis: 0,
          }}
        >
          {/* Only the stripe under the cursor is labelled — a full row of
              hexes on an 8-swatch card just becomes a smear of truncated text. */}
          {showLabels && hovered === i && (
            <span
              className="absolute inset-x-0 bottom-2 truncate px-1 text-center font-mono text-[10px] tracking-wide"
              style={{ color: readableInk(hex) }}
            >
              {(values?.[i] ?? hex).toUpperCase()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
