import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  ExternalLink,
  Globe,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { cohere, DEFAULT_COHESION, orderByLightness } from '@/lib/color/cohesion';
import { toHex, toOklch } from '@/lib/color/core';
import { EXPORT_FORMATS, exportAs, type ExportFormat } from '@/lib/color/export';
import { HARMONIES } from '@/lib/color/harmony';
import { generatePalette, paletteFromColors, recohere, TINT_SWATCHES } from '@/lib/color/palette';
import type { HarmonyKind, Palette } from '@/lib/color/types';
import { SEED_PALETTES } from '@/lib/data/palettes';
import { absoluteHref } from '@/lib/palette-url';
import { clusterColors, distinctCount, scanPage, type Sample, type ScanResult } from './extract';
import { load, save } from './storage';
import { Chip, copyText, Label, SIZES, Swatches, toast, Toaster, type CopyFormat } from './ui';

const SITE = 'https://cohesive-colors.github.io';
type Tab = 'generate' | 'page' | 'explore' | 'saved';

interface GenState {
  size: number;
  harmony: HarmonyKind | 'auto';
  tint: string;
  alpha: number;
  locks: (string | null)[];
  palette: Palette | null;
}

const DEFAULT_GEN: GenState = {
  size: 5,
  harmony: 'auto',
  tint: DEFAULT_COHESION.tint,
  alpha: DEFAULT_COHESION.alpha,
  locks: [],
  palette: null,
};

const sameColors = (a: Palette, b: Palette) => a.colors.join() === b.colors.join();

function siteLink(p: Palette): string {
  const url = new URL(absoluteHref(p, SITE));
  url.searchParams.set('ref', 'extension');
  return url.href;
}

function applyLocks(p: Palette, locks: (string | null)[]): Palette {
  if (!locks.some(Boolean)) return p;
  return { ...p, colors: p.colors.map((c, i) => locks[i] ?? c) };
}

export default function App() {
  const [tab, setTab] = useState<Tab>('generate');
  const [gen, setGen] = useState<GenState>(DEFAULT_GEN);
  const [saved, setSaved] = useState<Palette[]>([]);
  const [format, setFormat] = useState<CopyFormat>('hex');
  const [ready, setReady] = useState(false);

  // Restore the last session: the popup is destroyed every time it closes.
  useEffect(() => {
    void Promise.all([
      load<GenState>('gen', DEFAULT_GEN),
      load<Palette[]>('saved', []),
      load<CopyFormat>('format', 'hex'),
      load<Tab>('tab', 'generate'),
    ]).then(([g, s, f, t]) => {
      const state = { ...DEFAULT_GEN, ...g };
      if (!state.palette) state.palette = generatePalette({ size: state.size, cohesion: { tint: state.tint, alpha: state.alpha } });
      setGen(state);
      setSaved(s);
      setFormat(f);
      setTab(t);
      setReady(true);
    });
  }, []);

  useEffect(() => { if (ready) void save('gen', gen); }, [gen, ready]);
  useEffect(() => { if (ready) void save('saved', saved); }, [saved, ready]);
  useEffect(() => { if (ready) void save('format', format); }, [format, ready]);
  useEffect(() => { if (ready) void save('tab', tab); }, [tab, ready]);

  const isSaved = useCallback((p: Palette) => saved.some((s) => sameColors(s, p)), [saved]);
  const toggleSaved = useCallback((p: Palette) => {
    setSaved((list) => {
      if (list.some((s) => sameColors(s, p))) {
        toast('Removed from Saved');
        return list.filter((s) => !sameColors(s, p));
      }
      toast('Saved', p.colors[Math.floor(p.colors.length / 2)]);
      return [{ ...p, createdAt: new Date().toISOString() }, ...list].slice(0, 500);
    });
  }, []);

  const openInGenerator = useCallback((p: Palette) => {
    setGen((g) => ({
      ...g,
      size: p.colors.length,
      tint: p.cohesion?.tint ?? g.tint,
      alpha: p.cohesion?.alpha ?? g.alpha,
      locks: [],
      palette: p,
    }));
    setTab('generate');
  }, []);

  if (!ready) return <div className="h-[560px]" />;

  return (
    <div className="flex h-[580px] flex-col">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <a href={`${SITE}/?ref=extension`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
          <img src="icons/icon-32.png" alt="" className="h-6 w-6 rounded-md" />
          <span className="text-[14px] font-semibold tracking-tight">
            Cohesive <span className="font-medium text-ink-500">Colors</span>
          </span>
        </a>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as CopyFormat)}
          className="rounded-md border border-line bg-surface px-1.5 py-1 text-[11px] font-medium text-ink-700"
          title="Format used when you click a swatch"
          aria-label="Copy format"
        >
          <option value="hex">Copy HEX</option>
          <option value="rgb">Copy RGB</option>
          <option value="hsl">Copy HSL</option>
          <option value="oklch">Copy OKLCH</option>
        </select>
      </header>

      <nav className="grid grid-cols-4 gap-1 border-b border-line bg-surface px-2 py-1.5" role="tablist">
        {(
          [
            ['generate', 'Generate', Wand2],
            ['page', 'From page', Globe],
            ['explore', 'Explore', Search],
            ['saved', `Saved${saved.length ? ` ${saved.length}` : ''}`, Bookmark],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition ${
              tab === id ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-canvas'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </nav>

      <main className="scroll-thin flex-1 overflow-y-auto">
        {tab === 'generate' && (
          <GenerateView gen={gen} setGen={setGen} format={format} isSaved={isSaved} toggleSaved={toggleSaved} />
        )}
        {tab === 'page' && (
          <PageView format={format} tint={gen.tint} alpha={gen.alpha} isSaved={isSaved} toggleSaved={toggleSaved} onEdit={openInGenerator} />
        )}
        {tab === 'explore' && <ExploreView format={format} isSaved={isSaved} toggleSaved={toggleSaved} onEdit={openInGenerator} />}
        {tab === 'saved' && (
          <SavedView format={format} saved={saved} toggleSaved={toggleSaved} onEdit={openInGenerator} goExplore={() => setTab('explore')} />
        )}
      </main>
      <Toaster />
    </div>
  );
}

/* ================================================================ generate */

function GenerateView({
  gen,
  setGen,
  format,
  isSaved,
  toggleSaved,
}: {
  gen: GenState;
  setGen: React.Dispatch<React.SetStateAction<GenState>>;
  format: CopyFormat;
  isSaved: (p: Palette) => boolean;
  toggleSaved: (p: Palette) => void;
}) {
  const regenerate = useCallback(
    (patch: Partial<GenState> = {}) => {
      setGen((g) => {
        const next = { ...g, ...patch };
        const locks = next.locks.slice(0, next.size);
        const palette = generatePalette({
          size: next.size,
          harmony: next.harmony === 'auto' ? undefined : next.harmony,
          cohesion: { tint: next.tint, alpha: next.alpha },
          locks,
        });
        return { ...next, locks, palette };
      });
    },
    [setGen],
  );

  const retint = (patch: Partial<Pick<GenState, 'tint' | 'alpha'>>) => {
    setGen((g) => {
      const next = { ...g, ...patch };
      if (!next.palette) return next;
      const p = recohere(next.palette, { ...next.palette.cohesion, tint: next.tint, alpha: next.alpha });
      return { ...next, palette: applyLocks(p, next.locks) };
    });
  };

  // Space bar regenerates, as on the site's generator.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code !== 'Space' || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(t.tagName)) return;
      e.preventDefault();
      regenerate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [regenerate]);

  const p = gen.palette;
  if (!p) return null;

  const toggleLock = (i: number) =>
    setGen((g) => {
      const locks = g.locks.slice(0, g.size);
      while (locks.length < g.size) locks.push(null);
      locks[i] = locks[i] ? null : p.colors[i]!;
      return { ...g, locks };
    });

  return (
    <div className="space-y-4 p-4">
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-sm">
        <Swatches colors={p.colors} format={format} className="h-36" large locks={gen.locks} onToggleLock={toggleLock} />
        <PaletteBar palette={p} isSaved={isSaved} toggleSaved={toggleSaved} />
      </section>

      <button
        type="button"
        onClick={() => regenerate()}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 py-2.5 text-[13px] font-semibold text-white transition hover:bg-ink-700"
      >
        <Shuffle size={15} /> Generate
        <kbd className="ml-1 rounded border border-white/25 px-1.5 text-[10px] font-medium text-white/70">Space</kbd>
      </button>

      <div>
        <Label>Swatches</Label>
        <div className="flex flex-wrap gap-1">
          {SIZES.map((n) => (
            <Chip key={n} active={gen.size === n} onClick={() => regenerate({ size: n })}>
              {n}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <Label>Harmony</Label>
        <select
          value={gen.harmony}
          onChange={(e) => regenerate({ harmony: e.target.value as GenState['harmony'] })}
          className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-900"
        >
          <option value="auto">Surprise me</option>
          {HARMONIES.map((h) => (
            <option key={h} value={h}>
              {h[0]!.toUpperCase() + h.slice(1).replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Key colour · cohesion {Math.round((gen.alpha / 0.5) * 100)}%</Label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {TINT_SWATCHES.map((t) => (
            <button
              key={t.hex}
              type="button"
              onClick={() => retint({ tint: t.hex })}
              title={t.name}
              aria-label={t.name}
              aria-pressed={gen.tint === t.hex}
              className={`h-6 w-6 rounded-full ring-offset-2 transition ${
                gen.tint === t.hex ? 'ring-2 ring-ink-900' : 'ring-1 ring-black/10 hover:scale-110'
              }`}
              style={{ background: t.hex }}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={gen.alpha}
          onChange={(e) => retint({ alpha: Number(e.target.value) })}
          className="w-full"
          aria-label="Cohesion strength"
        />
      </div>

      <ExportRow palette={p} />
    </div>
  );
}

/* ============================================================ shared bars */

function PaletteBar({
  palette,
  isSaved,
  toggleSaved,
  onEdit,
}: {
  palette: Palette;
  isSaved: (p: Palette) => boolean;
  toggleSaved: (p: Palette) => void;
  onEdit?: (p: Palette) => void;
}) {
  const saved = isSaved(palette);
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{palette.name}</div>
        <div className="text-[11px] text-ink-500">
          {palette.colors.length} colours{palette.moods?.length ? ` · ${palette.moods.slice(0, 2).join(', ')}` : ''}
        </div>
      </div>
      {onEdit && (
        <IconButton label="Edit in generator" onClick={() => onEdit(palette)}>
          <Wand2 size={15} />
        </IconButton>
      )}
      <IconButton label={saved ? 'Remove from Saved' : 'Save'} onClick={() => toggleSaved(palette)}>
        {saved ? <BookmarkCheck size={15} className="text-accent" /> : <Bookmark size={15} />}
      </IconButton>
      <a
        href={siteLink(palette)}
        target="_blank"
        rel="noreferrer"
        title="Open on cohesive-colors"
        aria-label="Open on cohesive-colors"
        className="rounded-full p-1.5 text-ink-700 transition hover:bg-canvas hover:text-ink-900"
      >
        <ExternalLink size={15} />
      </a>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-full p-1.5 text-ink-700 transition hover:bg-canvas hover:text-ink-900"
    >
      {children}
    </button>
  );
}

function ExportRow({ palette }: { palette: Palette }) {
  const [fmt, setFmt] = useState<ExportFormat>('css');
  useEffect(() => {
    void load<ExportFormat>('exportFormat', 'css').then(setFmt);
  }, []);
  const choose = (f: ExportFormat) => {
    setFmt(f);
    void save('exportFormat', f);
  };
  const copy = async () => {
    const ok = await copyText(exportAs(fmt, palette));
    toast(ok ? `Copied as ${EXPORT_FORMATS.find((f) => f.id === fmt)?.label}` : 'Copy is blocked here');
  };
  return (
    <div>
      <Label>Export</Label>
      <div className="flex gap-2">
        <select
          value={fmt}
          onChange={(e) => choose(e.target.value as ExportFormat)}
          className="flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium"
          aria-label="Export format"
        >
          {EXPORT_FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink-900 transition hover:border-ink-300"
        >
          <Copy size={13} /> Copy code
        </button>
      </div>
    </div>
  );
}

/* ================================================================ page */

type ScanState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; result: ScanResult };

async function scanActiveTab(): Promise<ScanResult> {
  if (typeof chrome === 'undefined' || !chrome.scripting) {
    // Opened as a plain page (development): scan this document instead.
    return scanPage();
  }
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!active?.id) throw new Error('No active tab.');
  const url = active.url ?? '';
  if (/^(chrome|edge|about|chrome-extension|moz-extension|devtools|view-source):/.test(url) || /chromewebstore\.google\.com|chrome\.google\.com\/webstore/.test(url)) {
    throw new Error('Browsers don’t let extensions read this kind of page. Open a regular website and try again.');
  }
  const [res] = await chrome.scripting.executeScript({ target: { tabId: active.id }, func: scanPage });
  if (!res?.result) throw new Error('Could not read this page.');
  return res.result as ScanResult;
}

function PageView({
  format,
  tint,
  alpha,
  isSaved,
  toggleSaved,
  onEdit,
}: {
  format: CopyFormat;
  tint: string;
  alpha: number;
  isSaved: (p: Palette) => boolean;
  toggleSaved: (p: Palette) => void;
  onEdit: (p: Palette) => void;
}) {
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const [size, setSize] = useState(6);
  const [harmonise, setHarmonise] = useState(false);

  const scan = async () => {
    setState({ kind: 'busy' });
    try {
      setState({ kind: 'done', result: await scanActiveTab() });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  // Scan straight away: opening this tab is the user's request.
  useEffect(() => {
    void scan();
  }, []);

  const samples: Sample[] = state.kind === 'done' ? state.result.samples : [];
  const available = useMemo(() => distinctCount(samples), [samples]);

  const palette = useMemo<Palette | null>(() => {
    if (state.kind !== 'done') return null;
    let colors = clusterColors(samples, size);
    if (colors.length < 2) return null;
    if (harmonise) {
      const raw = colors.map(toOklch);
      const { colors: coh } = cohere(raw, { ...DEFAULT_COHESION, tint, alpha: Math.max(alpha, 0.12) });
      colors = orderByLightness(coh, true).map((i) => toHex(coh[i]!));
    }
    const host = state.result.host.replace(/^www\./, '') || 'This page';
    return paletteFromColors(colors, {
      name: `${host}${harmonise ? ' · cohesive' : ''}`,
      cohesion: { ...DEFAULT_COHESION, tint, alpha: harmonise ? alpha : 0 },
    });
  }, [state, samples, size, harmonise, tint, alpha]);

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs leading-relaxed text-ink-700">
        Pulls the colours this page actually uses — backgrounds, text, borders, icons — and reduces them to a palette.
        Nothing leaves your browser.
      </p>

      {state.kind === 'busy' && <div className="h-36 animate-pulse rounded-[var(--radius-card)] bg-line" />}

      {state.kind === 'error' && (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-xs leading-relaxed text-ink-700">
          {state.message}
        </div>
      )}

      {state.kind === 'done' && !palette && (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-xs text-ink-700">
          This page uses fewer than two distinct colours.
        </div>
      )}

      {palette && (
        <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-sm">
          <Swatches colors={palette.colors} format={format} className="h-36" large />
          <PaletteBar palette={palette} isSaved={isSaved} toggleSaved={toggleSaved} onEdit={onEdit} />
        </section>
      )}

      {state.kind === 'done' && (
        <>
          <div>
            <Label>Swatches</Label>
            <div className="flex flex-wrap gap-1">
              {SIZES.map((n) => (
                <Chip
                  key={n}
                  active={Math.min(size, available) === n}
                  onClick={() => setSize(n)}
                  title={n > available ? `This page has only ${available} distinct colours` : undefined}
                >
                  {n}
                </Chip>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3">
            <input
              type="checkbox"
              checked={harmonise}
              onChange={(e) => setHarmonise(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-ink-900"
            />
            <span>
              <span className="flex items-center gap-1 text-xs font-semibold">
                <Sparkles size={12} /> Make it cohesive
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-500">
                Runs the page’s colours through your key colour (
                <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: tint }} /> from
                Generate) so they sit on one shared hue axis.
              </span>
            </span>
          </label>

          {palette && <ExportRow palette={palette} />}

          <button
            type="button"
            onClick={() => void scan()}
            className="w-full rounded-full border border-line bg-surface py-2 text-xs font-semibold text-ink-900 transition hover:border-ink-300"
          >
            Scan again
          </button>
        </>
      )}
    </div>
  );
}

/* ============================================================== explore */

const PAGE = 40;

function ExploreView({
  format,
  isSaved,
  toggleSaved,
  onEdit,
}: {
  format: CopyFormat;
  isSaved: (p: Palette) => boolean;
  toggleSaved: (p: Palette) => void;
  onEdit: (p: Palette) => void;
}) {
  const [query, setQuery] = useState('');
  const [size, setSize] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEED_PALETTES.filter((p) => {
      if (size !== null && p.colors.length !== size) return false;
      if (!q) return true;
      if (q.startsWith('#')) return p.colors.some((c) => c.toLowerCase().startsWith(q));
      return p.name.toLowerCase().includes(q) || p.moods.some((m) => m.toLowerCase().includes(q)) || p.harmony.includes(q);
    }).sort((a, b) => b.likes - a.likes);
  }, [query, size]);

  useEffect(() => setLimit(PAGE), [query, size]);

  return (
    <div className="space-y-3 p-4">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names, moods or #hex"
          className="w-full rounded-full border border-line bg-surface py-2 pl-8 pr-3 text-xs outline-none focus:border-ink-300"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        <Chip active={size === null} onClick={() => setSize(null)}>
          All
        </Chip>
        {SIZES.map((n) => (
          <Chip key={n} active={size === n} onClick={() => setSize(size === n ? null : n)}>
            {n}
          </Chip>
        ))}
      </div>
      <div className="text-[11px] text-ink-500">{list.length} palettes</div>
      <div className="space-y-3">
        {list.slice(0, limit).map((p) => (
          <article key={p.id} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            <Swatches colors={p.colors} format={format} className="h-16" />
            <PaletteBar palette={p} isSaved={isSaved} toggleSaved={toggleSaved} onEdit={onEdit} />
          </article>
        ))}
      </div>
      {limit < list.length && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="w-full rounded-full border border-line bg-surface py-2 text-xs font-semibold"
        >
          Show more
        </button>
      )}
    </div>
  );
}

/* ================================================================ saved */

function SavedView({
  format,
  saved,
  toggleSaved,
  onEdit,
  goExplore,
}: {
  format: CopyFormat;
  saved: Palette[];
  toggleSaved: (p: Palette) => void;
  onEdit: (p: Palette) => void;
  goExplore: () => void;
}) {
  if (saved.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Bookmark size={28} className="text-ink-300" />
        <p className="text-xs leading-relaxed text-ink-700">
          Palettes you save from Generate, From page or Explore land here. They stay in this browser.
        </p>
        <button type="button" onClick={goExplore} className="rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white">
          Browse palettes
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3 p-4">
      {saved.map((p) => (
        <article key={`${p.id}-${p.colors.join('')}`} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          <Swatches colors={p.colors} format={format} className="h-16" />
          <div className="flex items-center gap-1 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{p.name}</div>
              <div className="text-[11px] text-ink-500">{p.colors.length} colours</div>
            </div>
            <IconButton label="Edit in generator" onClick={() => onEdit(p)}>
              <Wand2 size={15} />
            </IconButton>
            <IconButton label="Remove" onClick={() => toggleSaved(p)}>
              <Trash2 size={15} />
            </IconButton>
            <a
              href={siteLink(p)}
              target="_blank"
              rel="noreferrer"
              title="Open on cohesive-colors"
              aria-label="Open on cohesive-colors"
              className="rounded-full p-1.5 text-ink-700 hover:bg-canvas"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
