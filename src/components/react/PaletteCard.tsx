import { memo } from 'react';
import { Bookmark, Expand, Heart } from 'lucide-react';
import SwatchStrip from './SwatchStrip';
import ShareButton from './ShareButton';
import { paletteHref } from '@/lib/palette-url';
import { shortAge } from '@/lib/time';
import { useAppStore } from '@/store/useAppStore';
import { useHydrated } from '@/lib/useHydrated';
import { useLikes } from '@/lib/useLikes';
import type { Palette } from '@/lib/color/types';

interface Props {
  palette: Palette;
  onOpen: (palette: Palette) => void;
}

function PaletteCardBase({ palette, onOpen }: Props) {
  const hydrated = useHydrated();
  // Bookmarks stay in this browser; likes are shared when Firebase is on.
  const saved = useAppStore((s) => s.favorites.includes(palette.id));
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const likes = useLikes();

  const liked = likes.isLiked(palette.id);
  const likeCount = likes.count(palette);

  return (
    <article className="group relative overflow-hidden rounded-card border border-line bg-surface transition-shadow duration-200 hover:shadow-[0_10px_30px_-12px_rgba(20,22,28,0.28)]">
      {/* Fixed strip height keeps the grid rock-steady while palettes stream in. */}
      <div className="relative h-[128px] w-full">
        <SwatchStrip colors={palette.colors} />

        <button
          type="button"
          onClick={() => onOpen(palette)}
          aria-label={`Open ${palette.name} in the editor`}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/85 text-ink-700 opacity-0 shadow-sm backdrop-blur transition hover:bg-white hover:text-ink-900 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Expand className="size-[15px]" strokeWidth={2} />
        </button>

        <div className="absolute right-20 top-2 opacity-0 transition group-hover:opacity-100 [&>button]:size-8 [&>button]:border-0 [&>button]:bg-white/85 [&>button]:shadow-sm [&>button]:backdrop-blur">
          <ShareButton palette={palette} />
        </div>

        <button
          type="button"
          onClick={() => toggleFavorite(palette.id)}
          aria-label={saved ? `Remove ${palette.name} from saved` : `Save ${palette.name}`}
          aria-pressed={hydrated ? saved : undefined}
          className={`absolute right-11 top-2 grid size-8 place-items-center rounded-full bg-white/85 shadow-sm backdrop-blur transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 ${
            hydrated && saved ? 'text-accent opacity-100' : 'text-ink-700 opacity-0'
          }`}
        >
          <Bookmark className="size-[15px]" strokeWidth={2} fill={hydrated && saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex h-11 items-center gap-2 px-3">
        <a
          href={paletteHref(palette)}
          className="truncate text-[12.5px] font-medium text-ink-900 hover:underline"
        >
          {palette.name}
        </a>
        <span className="shrink-0 text-[10.5px] text-ink-300">{shortAge(palette.createdAt)}</span>

        <button
          type="button"
          onClick={() => void likes.toggle(palette)}
          aria-label={liked ? `Unlike ${palette.name}` : `Like ${palette.name}`}
          aria-pressed={hydrated ? liked : undefined}
          className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-ink-500 transition hover:text-accent"
        >
          <Heart
            className={`size-[13px] transition ${liked ? 'text-accent' : ''}`}
            strokeWidth={2}
            fill={liked ? 'currentColor' : 'none'}
          />
          {likeCount}
        </button>
      </div>
    </article>
  );
}

export default memo(PaletteCardBase);
