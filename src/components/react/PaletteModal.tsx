import { useEffect, useRef } from 'react';
import { Bookmark, ExternalLink, Heart, Sparkles, UploadCloud, X } from 'lucide-react';
import PaletteEditor from './PaletteEditor';
import ShareButton from './ShareButton';
import { paletteHref } from '@/lib/palette-url';
import { toast } from '@/store/useToastStore';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { useLikes } from '@/lib/useLikes';
import type { Palette } from '@/lib/color/types';

interface Props {
  palette: Palette | null;
  onClose: () => void;
}

export default function PaletteModal({ palette, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const saved = useAppStore((s) => (palette ? s.favorites.includes(palette.id) : false));
  const likes = useLikes();
  const publish = useRemoteStore((s) => s.publish);
  const published = useRemoteStore((s) => (palette ? s.palettes.some((x) => x.id === palette.id) : false));
  const liked = palette ? likes.isLiked(palette.id) : false;

  // Escape to close, and hold the page still behind the modal.
  useEffect(() => {
    if (!palette) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [palette, onClose]);

  if (!palette) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink-900/55 p-3 backdrop-blur-sm sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${palette.name} palette editor`}
        className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-surface shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold text-ink-900">{palette.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
              <span className="rounded-full bg-canvas px-2 py-0.5">{palette.colors.length} colors</span>
              <span className="rounded-full bg-canvas px-2 py-0.5">{palette.harmony}</span>
              {palette.moods.map((m) => (
                <span key={m} className="rounded-full bg-canvas px-2 py-0.5">{m}</span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5">
                <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: palette.cohesion.tint }} />
                key {Math.round(palette.cohesion.alpha * 100)}%
              </span>
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void likes.toggle(palette)}
              aria-pressed={liked}
              aria-label="Like this palette"
              className={`grid size-9 place-items-center rounded-full border border-line transition hover:border-ink-300 ${liked ? 'text-accent' : 'text-ink-700'}`}
            >
              <Heart className="size-4" fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(palette.id)}
              aria-pressed={saved}
              aria-label="Save this palette"
              className={`grid size-9 place-items-center rounded-full border border-line transition hover:border-ink-300 ${saved ? 'text-accent' : 'text-ink-700'}`}
            >
              <Bookmark className="size-4" fill={saved ? 'currentColor' : 'none'} />
            </button>
            {likes.shared && !published && (
              <button
                type="button"
                onClick={async () => {
                  const result = await publish(palette);
                  toast(
                    result === 'published'
                      ? 'Published to the shared feed'
                      : 'Could not publish, check your connection',
                    { tone: result === 'published' ? 'default' : 'error' },
                  );
                }}
                className="hidden h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900 sm:inline-flex"
              >
                <UploadCloud className="size-3.5" />
                Publish
              </button>
            )}
            <ShareButton palette={palette} />
            <a
              href={paletteHref(palette)}
              aria-label="Open this palette on its own page"
              className="hidden h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900 sm:inline-flex"
            >
              <ExternalLink className="size-3.5" />
              Open page
            </a>
            <a
              href={`/generator?seed=${palette.seed}&size=${palette.colors.length}`}
              className="hidden h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900 lg:inline-flex"
            >
              <Sparkles className="size-3.5" />
              Generator
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-9 place-items-center rounded-full border border-line text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <PaletteEditor palette={palette} />
      </div>
    </div>
  );
}
