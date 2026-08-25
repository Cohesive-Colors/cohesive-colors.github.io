import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, Download, Heart, Sparkles, UploadCloud } from 'lucide-react';
import PaletteEditor from './PaletteEditor';
import ShareButton from './ShareButton';
import PaletteCard from './PaletteCard';
import PaletteModal from './PaletteModal';
import Toaster from './Toaster';
import { hasOwnPage } from '@/lib/palette-url';
import { toPinCard, slug, PIN_VARIANTS, type PinVariant } from '@/lib/color/export';
import { downloadPinCard, pinCardObjectUrl } from '@/lib/download';
import { paletteFromView, paletteHref, parseViewParams } from '@/lib/palette-url';
import { hubHref } from '@/lib/seo';
import { hueFamily } from '@/lib/color/naming';
import { shortAge } from '@/lib/time';
import { useAppStore } from '@/store/useAppStore';
import { useRemoteStore } from '@/store/useRemoteStore';
import { useLikes } from '@/lib/useLikes';
import type { Palette } from '@/lib/color/types';

interface Props {
  /** Prerendered seed palettes arrive as a prop; /palette/view resolves at runtime. */
  palette?: Palette;
  /** Related palettes, picked at build time so the seed stays out of the bundle. */
  siblings?: Palette[];
}

export default function PaletteDetail({ palette: prerendered, siblings = [] }: Props) {
  const [fromUrl, setFromUrl] = useState<Palette | null>(null);
  // Read after mount, never during render: the server has no window, and React
  // keeps the server-rendered attribute rather than patching the mismatch.
  const [origin, setOrigin] = useState('');
  const [localPin, setLocalPin] = useState<string | null>(null);
  const [variant, setVariant] = useState<PinVariant>('stripes');
  const [related, setRelated] = useState<Palette | null>(null);

  const remotePalettes = useRemoteStore((s) => s.palettes);
  const startRemote = useRemoteStore((s) => s.start);
  const publish = useRemoteStore((s) => s.publish);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const likes = useLikes();

  useEffect(() => startRemote(), [startRemote]);
  useEffect(() => setOrigin(window.location.origin), []);

  // /palette/view carries the colours in the query string, so a generated
  // palette can be linked before it has been published anywhere.
  useEffect(() => {
    if (prerendered) return;
    setFromUrl(paletteFromView(parseViewParams(window.location.search)));
  }, [prerendered]);

  const base = prerendered ?? fromUrl;

  // A published copy wins: it carries the live like count.
  const palette = useMemo(() => {
    if (!base) return null;
    return remotePalettes.find((p) => p.id === base.id) ?? base;
  }, [base, remotePalettes]);

  const saved = useAppStore((s) => (palette ? s.favorites.includes(palette.id) : false));
  const published = palette ? remotePalettes.some((p) => p.id === palette.id) : false;

  useEffect(() => {
    if (!palette || hasOwnPage(palette)) return;
    let url: string | null = null;
    let cancelled = false;
    pinCardObjectUrl(palette, variant)
      .then((made) => {
        url = made;
        if (cancelled) URL.revokeObjectURL(made);
        else setLocalPin(made);
      })
      .catch(() => {
        /* the SVG data URI stays as the fallback */
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setLocalPin(null);
    };
  }, [palette?.id, variant]);

  if (!palette) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-[20px] font-semibold text-ink-900">That link does not describe a palette</h1>
        <p className="mt-3 text-[13px] text-ink-500">
          It may have been truncated. Palette links end in a list of hex codes.
        </p>
        <a
          href="/"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[13px] font-medium text-white"
        >
          <ArrowLeft className="size-4" />
          Back to the feed
        </a>
      </div>
    );
  }

  const liked = likes.isLiked(palette.id);

  // Curated palettes have images rendered at build time; anything else falls
  // back to the same card drawn inline, which can be downloaded but not pinned
  // (Pinterest needs a URL it can fetch).
  const prebuilt = hasOwnPage(palette);
  const pinFile = variant === 'stripes' ? 'pin' : `pin-${variant}`;
  const pinImage = prebuilt
    ? `/social/${palette.id}-${pinFile}.png`
    : (localPin ?? `data:image/svg+xml,${encodeURIComponent(toPinCard(palette, variant))}`);
  const pageUrl = origin ? new URL(paletteHref(palette), origin).href : '';
  const absolutePin = origin && prebuilt ? new URL(pinImage, origin).href : '';
  const pinDescription = `${palette.name}, ${palette.colors.length} colour palette (${palette.colors
    .join(', ')
    .toUpperCase()}) harmonised in OKLCH`;

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-ink-500">
        <a href="/" className="transition hover:text-ink-900">Home</a>
        <span className="text-ink-300">/</span>
        <a href="/palettes" className="transition hover:text-ink-900">Palettes</a>
        <span className="text-ink-300">/</span>
        <span className="text-ink-900">{palette.name}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold tracking-tight text-ink-900">{palette.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-500">
            <span className="rounded-full bg-surface px-2 py-0.5">{palette.colors.length} colors</span>
            <span className="rounded-full bg-surface px-2 py-0.5">{palette.harmony}</span>
            {palette.moods.map((m) => (
              <a key={m} href={hubHref('mood', m)} className="rounded-full bg-surface px-2 py-0.5 hover:text-ink-900">
                {m}
              </a>
            ))}
            <a href={hubHref('hue', hueFamily(palette.hue).name)} className="rounded-full bg-surface px-2 py-0.5 hover:text-ink-900">
              {hueFamily(palette.hue).name}
            </a>
            <a href={hubHref('size', palette.colors.length)} className="rounded-full bg-surface px-2 py-0.5 hover:text-ink-900">
              {palette.colors.length} color palettes
            </a>
            <span className="rounded-full bg-surface px-2 py-0.5">{shortAge(palette.createdAt)} old</span>
          </p>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => void likes.toggle(palette)}
            aria-pressed={liked}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium transition hover:border-ink-300 ${liked ? 'text-accent' : 'text-ink-700'}`}
          >
            <Heart className="size-4" fill={liked ? 'currentColor' : 'none'} />
            {likes.count(palette)}
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
          <ShareButton palette={palette} label />
          {likes.shared && !published && (
            <button
              type="button"
              onClick={async () => {
                const result = await publish(palette);
                window.dispatchEvent(new Event('resize'));
                if (result !== 'published') return;
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
            >
              <UploadCloud className="size-4" />
              Publish
            </button>
          )}
          <a
            href={`/generator?seed=${palette.seed}&size=${palette.colors.length}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-900 px-3.5 text-[12px] font-medium text-white transition hover:opacity-90"
          >
            <Sparkles className="size-4" />
            Open in generator
          </a>
        </div>
      </header>

      <div className="mt-6">
        <PaletteEditor palette={palette} size="page" />
      </div>

      <section className="mt-14 border-t border-line pt-8">
        <div className="grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
          <img
            src={pinImage}
            width={1000}
            height={1500}
            alt={`${palette.name} palette, ${palette.colors.join(', ')}`}
            data-pin-media={pinImage}
            data-pin-description={pinDescription}
            className="w-full max-w-[220px] rounded-xl border border-line shadow-sm"
            loading="lazy"
          />

          <div>
            <h2 className="text-[14px] font-semibold text-ink-900">Share this palette as an image</h2>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-500">
              A 1000×1500 card with every hex code on it, the shape Pinterest ranks, and readable
              enough that the image alone is enough to rebuild the palette.
            </p>

            <div className="mt-4 flex gap-1.5">
              {PIN_VARIANTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  aria-pressed={variant === v}
                  className={`rounded-full border px-3 py-1 text-[11.5px] font-medium capitalize transition ${
                    variant === v
                      ? 'border-ink-900 bg-ink-900 text-white'
                      : 'border-line text-ink-700 hover:border-ink-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {prebuilt && absolutePin && (
                <a
                  href={`https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&media=${encodeURIComponent(absolutePin)}&description=${encodeURIComponent(pinDescription)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#e60023] px-4 text-[12.5px] font-medium text-white transition hover:opacity-90"
                >
                  Save to Pinterest
                </a>
              )}

              <button
                type="button"
                onClick={async () => {
                  try {
                    if (prebuilt) {
                      const a = document.createElement('a');
                      a.href = pinImage;
                      a.download = `${slug(palette.name)}-pin.png`;
                      a.click();
                    } else {
                      await downloadPinCard(palette, `${slug(palette.name)}-pin.png`, variant);
                    }
                  } catch {
                    /* the toast in ExportPanel covers the common failure */
                  }
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12.5px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
              >
                <Download className="size-3.5" />
                Download 1000×1500
              </button>
            </div>

            {!prebuilt && (
              <p className="mt-3 max-w-md text-[11.5px] leading-relaxed text-ink-300">
                This palette has no hosted image yet, Pinterest needs a public URL, so publish it
                first, or download the card and upload it yourself.
              </p>
            )}
          </div>
        </div>
      </section>

      {siblings.length > 0 && (
        <section className="mt-14 border-t border-line pt-8">
          <h2 className="text-[14px] font-semibold text-ink-900">
            More {hueFamily(palette.hue).name.toLowerCase()} palettes
          </h2>
          <div className="feed-grid mt-4">
            {siblings.map((p) => (
              <PaletteCard key={p.id} palette={p} onOpen={setRelated} />
            ))}
          </div>
        </section>
      )}

      <PaletteModal palette={related} onClose={() => setRelated(null)} />
      <Toaster />
    </>
  );
}
