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

## Android app (`mobile/`)

Expo + React Native app that imports this site's code through the `@/…` alias
(see `mobile/README.md`). Consequences for site work:

- `src/lib/**` and `src/store/useToastStore.ts`, `src/store/useRemoteStore.ts`
  also run on Hermes — no DOM, `window` or `localStorage` there.
- `src/lib/firebase/config.ts`, `client.ts` and `src/store/useAppStore.ts` have
  mobile twins in `mobile/src/{shims,store}`; keep their exports in step.
- After changing shared code, also run `cd mobile && npm run typecheck`.
- Store release steps: `mobile/PLAY_STORE.md`. The Play listing links to `/privacy`.

## Android app (`mobile/`)

Expo + React Native app that imports this site's code through the `@/…` alias
(see `mobile/README.md`). Consequences for site work:

- `src/lib/**` and `src/store/useToastStore.ts`, `src/store/useRemoteStore.ts`
  also run on Hermes — no DOM, `window` or `localStorage` there.
- `src/lib/firebase/config.ts`, `client.ts` and `src/store/useAppStore.ts` have
  mobile twins in `mobile/src/{shims,store}`; keep their exports in step.
- After changing shared code, also run `cd mobile && npm run typecheck`.
- Store release steps: `mobile/PLAY_STORE.md`. The Play listing links to `/privacy`.

## Browser extension (`extensions/browser/`)

Manifest V3 popup for Chrome/Edge and Firefox (`npm run build` makes both) that imports this site's
code through the same `@/…` alias (see `extensions/browser/README.md`):

- It bundles `src/lib/color/**`, `src/lib/palette-url.ts` and
  `src/lib/data/palettes.ts` — keep those free of DOM/Astro/Firebase imports.
- After changing the engine or re-running `npm run seed`, rebuild it:
  `cd extensions/browser && npm run build`.
- `extract.ts` → `scanPage()` is injected into tabs and must stay
  self-contained (no imports).
- Browser differences live only in `src/ext.ts` (browser.* vs chrome.*) and
  `scripts/finalize.mjs` (Firefox add-on id, min version,
  `data_collection_permissions`). The add-on id is permanent — never change it.
- Store submission: `extensions/browser/STORE_LISTING.md` (Chrome, Edge) and
  `extensions/browser/AMO_LISTING.md` (Firefox, needs the source package from
  `npm run zip:firefox`). The listing links to
  `/privacy`, which has a "Browser extension" section — keep them in step.

## Plugins page

`/plugins` lists every platform from `src/lib/data/plugins.ts`. When a store
listing goes live, set that entry's `status: 'available'` and its `url` — the
card gets an install button and the structured data an Offer. Use generic
icons only; store and product logos are their owners' trademarks.

## Obsidian plugin (`extensions/obsidian/`)

Published from its own repository (Cohesive-Colors/cohesive-colors-obsidian),
so unlike the browser extension it does not import `../../src` at build time:
`src/engine/` is a copy made by `npm run sync-engine`. After changing
`src/lib/color/**` or re-running `npm run seed`, run
`cd extensions/obsidian && npm run sync-engine` and commit `src/engine/`.
Lint with `npm run lint` (eslint-plugin-obsidianmd, the rules community review
uses). Plugin id `cohesive-colors` is permanent. Publishing steps:
`extensions/obsidian/PUBLISHING.md`.
