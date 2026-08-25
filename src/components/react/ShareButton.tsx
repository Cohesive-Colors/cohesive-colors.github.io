import { Link2 } from 'lucide-react';
import { copyText } from '@/lib/clipboard';
import { toast } from '@/store/useToastStore';
import { paletteHref } from '@/lib/palette-url';
import type { Palette } from '@/lib/color/types';

/**
 * Copies the palette's canonical link. Generated palettes carry their colours
 * in the URL, so the link works even though nothing was saved anywhere.
 */
export default function ShareButton({
  palette,
  label = false,
}: {
  palette: Palette;
  label?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label="Copy a link to this palette"
      onClick={async (e) => {
        e.stopPropagation();
        const url = new URL(paletteHref(palette), window.location.origin).href;
        const ok = await copyText(url);
        toast(ok ? 'Link copied' : 'Copy is blocked in this browser', {
          swatch: palette.colors[Math.floor(palette.colors.length / 2)],
          tone: ok ? 'default' : 'error',
        });
      }}
      className={
        label
          ? 'inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900'
          : 'grid size-9 place-items-center rounded-full border border-line text-ink-700 transition hover:border-ink-300 hover:text-ink-900'
      }
    >
      <Link2 className="size-4" />
      {label && 'Copy link'}
    </button>
  );
}
