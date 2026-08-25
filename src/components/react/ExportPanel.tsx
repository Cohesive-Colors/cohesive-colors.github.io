import { useMemo, useState } from 'react';
import { Copy, Download, FileImage, FileCode2 } from 'lucide-react';
import { EXPORT_FORMATS, exportAs, extensionFor, slug, type ExportFormat } from '@/lib/color/export';
import { copyText } from '@/lib/clipboard';
import { downloadPng, downloadSvg, downloadText } from '@/lib/download';
import { toast } from '@/store/useToastStore';
import type { Palette } from '@/lib/color/types';

export default function ExportPanel({ palette }: { palette: Palette }) {
  const [format, setFormat] = useState<ExportFormat>('css');
  const code = useMemo(() => exportAs(format, palette), [format, palette]);
  const filename = `${slug(palette.name)}.${extensionFor(format)}`;

  const copy = async () => {
    const ok = await copyText(code);
    toast(ok ? `Copied ${filename}` : 'Copy is blocked in this browser', {
      tone: ok ? 'default' : 'error',
    });
  };

  const savePng = async () => {
    try {
      await downloadPng(palette, `${slug(palette.name)}.png`);
      toast('Downloaded PNG swatch card');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'PNG export failed', { tone: 'error' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {EXPORT_FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFormat(f.id)}
            className={`rounded-full border px-2.5 py-1 text-[11.5px] transition ${
              format === f.id
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-line text-ink-700 hover:border-ink-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <pre className="max-h-64 overflow-auto scrollbar-thin rounded-xl bg-ink-900 p-4 pr-24 font-mono text-[11.5px] leading-relaxed text-white/90">
          <code>{code}</code>
        </pre>
        <div className="absolute right-3 top-3 flex gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <Copy className="size-3.5" />
            Copy
          </button>
          <button
            type="button"
            onClick={() => {
              downloadText(code, filename);
              toast(`Downloaded ${filename}`);
            }}
            aria-label={`Download ${filename}`}
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={savePng}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[12px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
        >
          <FileImage className="size-3.5" />
          PNG card · 1200×630
        </button>
        <button
          type="button"
          onClick={() => {
            downloadSvg(palette, `${slug(palette.name)}.svg`);
            toast('Downloaded SVG swatch card');
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[12px] font-medium text-ink-700 transition hover:border-ink-300 hover:text-ink-900"
        >
          <FileCode2 className="size-3.5" />
          SVG card
        </button>
      </div>
    </div>
  );
}
