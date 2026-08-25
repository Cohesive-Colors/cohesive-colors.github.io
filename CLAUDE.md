# Cohesive Colors — working notes

## Development

```sh
npm run dev          # astro dev on :4321
npm run build        # static build
npm run test         # bundles the TS engine with esbuild, then runs node:test
npm run seed         # regenerates src/lib/data/palettes.json
```

## Architecture rules

- `src/lib/color/**` is the colour engine. Keep it free of React, DOM and Astro
  imports — it is bundled standalone for the tests and for the seed script.
- Colour maths goes through `culori` in OKLCH/OKLab. Do not clip RGB channels to
  fix out-of-gamut colours; use `toGamut()` in `core.ts`, which binary-searches
  chroma and leaves hue and lightness alone.
- Anything random must go through `makeRng(seed)` so palettes stay reproducible.
- `src/lib/feed.ts` is pure and unit-tested; keep filtering and sorting there
  rather than inside components.
- React islands live in `src/components/react/`; static chrome is `.astro`.
- Anything reading `localStorage` must be guarded with `useHydrated()` or it
  will cause a hydration mismatch.

## Firebase

Optional and lazily loaded. Rules live in `database.rules.json`; the like
counter and `/userLikes/{uid}/{id}` must always be written in the SAME
multi-path update, because the rules validate one against the other. If you
change either side, re-check both in `npm run emulate` — a mistake here means
either broken likes or an open counter.

Never make Firebase a hard dependency of rendering: `getFirebase()` returning
`null` is a supported state, not an error path.

## After changing the brand mark

Replace `src/assets/brand/icon-source.png` and run `npm run icons`. Everything
in `public/` except `site.webmanifest` and `favicon.svg` is generated output.
`favicon.svg` is hand-authored — it mirrors the source geometry (four columns,
overlay band at 44.6–54.1% height, 18.4% corner radius).

## After changing the engine

Re-run `npm run seed` — the committed feed is generated output, and scoring or
harmony changes will silently leave it stale.

## Documentation

Full Astro documentation: https://docs.astro.build
