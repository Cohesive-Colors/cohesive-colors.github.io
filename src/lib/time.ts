const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600_000],
  ['month', 30 * 24 * 3600_000],
  ['day', 24 * 3600_000],
  ['hour', 3600_000],
  ['minute', 60_000],
];

/**
 * "3 days", "6 hours" — the short, unit-only form ColorDrop uses under each
 * card. Rendered from a fixed reference so server and client agree and the
 * card never reflows after hydration.
 */
export function shortAge(iso: string, now: number = Date.parse('2026-08-22T09:00:00.000Z')): string {
  const delta = Math.max(0, now - Date.parse(iso));
  for (const [unit, ms] of UNITS) {
    if (delta >= ms) {
      const value = Math.floor(delta / ms);
      return `${value} ${unit}${value === 1 ? '' : 's'}`;
    }
  }
  return 'just now';
}
