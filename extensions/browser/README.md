# Cohesive Colors — browser extension

Manifest V3 popup for Chrome, Edge (same package as Chrome) and Firefox (its
own build target from the same code).

What it does:

- **Generate** — the site's generator in a popup: 3–10 swatches, harmony, key
  colour + cohesion strength, lock swatches, Space to regenerate.
- **From page** — reads the colours the active tab actually uses (computed
  backgrounds, text, borders, SVG fills), clusters them in OKLab into 3–10
  swatches, optionally runs them through the cohesion pass.
- **Explore** — the 480 curated palettes from `src/lib/data/palettes.json`,
  searchable and filterable by size.
- **Saved** — bookmarks in `chrome.storage.local`.
- Click any swatch to copy (HEX / RGB / HSL / OKLCH); "Copy code" exports CSS,
  Tailwind v4, SCSS, JSON, Swift, Android XML or SVG; ↗ opens the palette on
  the site.

## How it is wired

The colour engine is **not copied**. `vite.config.ts` points the `@/…` alias at
the site's `src/`, exactly like the Android app does, so the extension imports
`src/lib/color/**`, `src/lib/palette-url.ts` and `src/lib/data/palettes.ts`
directly. Rules that follow from that:

- Only framework-free modules from `src/lib` may be imported (no Astro, no
  Firebase, no `localStorage`).
- After changing the engine or re-running `npm run seed`, rebuild the extension
  so the bundled feed and maths match the site.
- `culori` resolves from the repo root's `node_modules`, so run `npm install`
  in the repo root first.

`src/extract.ts` → `scanPage()` is injected into the tab with
`chrome.scripting.executeScript`. It must stay self-contained: no imports, no
references to module scope, because only its source text is sent to the page.

Permissions are deliberately minimal — `activeTab` + `scripting` (read the
current tab only after the user opens the popup) and `storage`. No host
permissions, no background worker, no remote code. Keep it that way: every
extra permission lengthens store review.

## Commands

```powershell
# once, from the repo root
npm install
cd extensions/browser
npm install

npm run build          # → dist/chrome and dist/firefox
npm run build:chrome   # → dist/chrome only
npm run build:firefox  # → dist/firefox only (unminified, with gecko settings)
npm run zip            # → both store zips + the Firefox source package in release/
npm run zip:chrome     # → release/cohesive-colors-chrome-<version>.zip
npm run zip:firefox    # → release/cohesive-colors-firefox-<version>.zip + -source.zip
npm run lint:firefox   # Mozilla's addons-linter over dist/firefox
npm run run:firefox    # opens your Firefox with the add-on loaded
npm run dev            # Chrome build on save; press ↻ on chrome://extensions
```

Load it locally:

- Chrome / Edge: `chrome://extensions` → Developer mode → **Load unpacked** →
  pick `extensions/browser/dist/chrome`.
- Firefox: `npm run run:firefox`, or `about:debugging#/runtime/this-firefox` →
  **Load Temporary Add-on…** → `dist/firefox/manifest.json`.

Browser differences live in two places only: `src/ext.ts` picks `browser.*`
(Firefox) or `chrome.*` (Chrome/Edge), and `scripts/finalize.mjs` adds the
Firefox manifest keys (add-on id, minimum version, `data_collection_permissions`).
The Firefox build is unminified because AMO reviewers read the shipped code.

Version lives in `package.json` only; `scripts/finalize.mjs` writes it into the
built manifest. Bump it for every store upload — the store rejects a version
it has already seen.

Store submission steps and listing text: [STORE_LISTING.md](STORE_LISTING.md)
(Chrome Web Store, Edge Add-ons) and [AMO_LISTING.md](AMO_LISTING.md)
(addons.mozilla.org). Listing images: `store-assets/`.

Keep `package-lock.json` committed: the Firefox source package ships it so the
reviewer's build matches the upload exactly.
