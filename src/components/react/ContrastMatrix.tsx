import { useMemo } from 'react';
import { readableInk, wcag } from '@/lib/color/core';

interface Props {
  colors: string[];
}

const BADGE: Record<string, string> = {
  AAA: 'bg-emerald-100 text-emerald-800',
  AA: 'bg-emerald-50 text-emerald-700',
  'AA Large': 'bg-amber-50 text-amber-700',
  Fail: 'bg-red-50 text-red-600',
};

/**
 * Every swatch against every other swatch, WCAG 2.1 contrast ratio.
 * The diagonal shows how each colour performs against black and white text.
 */
export default function ContrastMatrix({ colors }: Props) {
  const rows = useMemo(
    () => colors.map((bg) => colors.map((fg) => wcag(bg, fg))),
    [colors],
  );

  const best = useMemo(() => {
    let top = { ratio: 0, bg: colors[0]!, fg: colors[0]! };
    colors.forEach((bg, i) =>
      colors.forEach((fg, j) => {
        if (i === j) return;
        const r = rows[i]![j]!.ratio;
        if (r > top.ratio) top = { ratio: r, bg, fg };
      }),
    );
    return top;
  }, [colors, rows]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[420px] border-separate border-spacing-1 text-[11px]">
          <caption className="sr-only">
            WCAG 2.1 contrast ratios between every pair of swatches
          </caption>
          <thead>
            <tr>
              <th className="w-14" />
              {colors.map((c, i) => (
                <th key={`h-${i}`} scope="col" className="p-0">
                  <span className="mx-auto block h-4 w-full rounded" style={{ background: c }} />
                  <span className="sr-only">{c}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((bg, i) => (
              <tr key={`r-${i}`}>
                <th scope="row" className="p-0">
                  <span className="block h-7 w-12 rounded" style={{ background: bg }} />
                  <span className="sr-only">{bg}</span>
                </th>
                {colors.map((fg, j) => {
                  const v = rows[i]![j]!;
                  return (
                    <td key={`c-${i}-${j}`} className="p-0">
                      <div
                        title={`${bg} on ${fg}, ${v.ratio.toFixed(2)}:1 (${v.label})`}
                        className="grid h-7 place-items-center rounded font-mono tabular-nums"
                        style={{
                          background: i === j ? bg : fg,
                          color: i === j ? readableInk(bg) : bg,
                          opacity: i === j ? 1 : undefined,
                        }}
                      >
                        {i === j ? ', ' : v.ratio.toFixed(1)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Text safety per swatch</p>
          <ul className="mt-2 space-y-1.5">
            {colors.map((c, i) => {
              const onWhite = wcag(c, '#ffffff');
              const onBlack = wcag(c, '#000000');
              const winner = onWhite.ratio >= onBlack.ratio ? onWhite : onBlack;
              const ink = readableInk(c);
              return (
                <li key={`t-${i}`} className="flex items-center gap-2">
                  <span
                    className="grid h-6 w-14 shrink-0 place-items-center rounded text-[10px] font-semibold"
                    style={{ background: c, color: ink }}
                  >
                    Aa
                  </span>
                  <span className="font-mono text-[11px] text-ink-700">{c.toUpperCase()}</span>
                  <span
                    className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium ${BADGE[winner.label]}`}
                  >
                    {winner.label} · {winner.ratio.toFixed(2)}:1
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-line p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Best pairing</p>
          <div
            className="mt-2 grid h-[104px] place-items-center rounded-lg px-3 text-center"
            style={{ background: best.bg, color: best.fg }}
          >
            <div>
              <p className="text-[15px] font-semibold">The quick brown fox</p>
              <p className="text-[11px] opacity-80">
                {best.ratio.toFixed(2)}:1, passes {wcag(best.bg, best.fg).label}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            WCAG 2.1 asks for 4.5:1 on body text and 3:1 on large text (18.66px bold or 24px regular).
          </p>
        </div>
      </div>
    </div>
  );
}
