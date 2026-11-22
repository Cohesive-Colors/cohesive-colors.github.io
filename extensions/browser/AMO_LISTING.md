# Firefox Add-ons (addons.mozilla.org) — submission kit

Everything the AMO Developer Hub asks for, in the order it asks. Copy the
blocks as they are. Screenshots are the same as for Chrome: `store-assets/`.

## 0. Before the first upload

1. **Deploy the site** so `/privacy` (with its "Browser extension" section) is
   live.
2. **Account**: https://addons.mozilla.org/developers/ → log in with a Mozilla
   account (free). The public author name is your AMO profile's display name:
   set it to "Cohesive Colors" under *Edit My Profile* to keep your own name
   off the listing.
3. Build both packages (needs `npm install` in this folder once, so the source
   package has a lockfile):

   ```powershell
   cd extensions/browser
   npm install
   npm run zip:firefox
   ```

   This writes two files to `release/`:
   - `cohesive-colors-firefox-1.0.0.zip` — the add-on
   - `cohesive-colors-firefox-1.0.0-source.zip` — the source package for review
4. Optional check before uploading: `npm run lint:firefox` (Mozilla's
   addons-linter). Expected result: 0 errors, 2 warnings about `innerHTML` in
   react-dom — see the reviewer notes below.

The add-on id `cohesive-colors@cohesive-colors.github.io` (set in
`scripts/finalize.mjs`) is permanent once uploaded: every update must keep it.

## 1. Submit a New Add-on

- **How to distribute**: *On this site* (listed on AMO).
- **Upload**: `release/cohesive-colors-firefox-1.0.0.zip`.
- **Compatible platforms**: Firefox for desktop. Leave Android unticked — the
  popup is laid out for a desktop toolbar.
- **Do you need to submit source code?** → **Yes**, upload
  `release/cohesive-colors-firefox-1.0.0-source.zip`. The code is bundled with
  Vite, which AMO counts as machine-generated. The archive contains
  `SOURCE_BUILD.md` with the exact build steps.

## 2. Describe Add-on

**Name**: `Cohesive Colors — Palette Generator`

**Add-on URL (slug)**: `cohesive-colors`

**Summary** (max 250):

```
Generate cohesive colour palettes of 3 to 10 swatches, pull the palette out of any web page, and copy it as CSS, Tailwind or JSON. Every colour runs through one shared key colour, so the set belongs together.
```

**Description**:

```
Cohesive Colors makes colour palettes that already belong together — and lets you choose exactly how many colours you need, from 3 to 10.

Most palette generators hand you five random colours that fight each other. Cohesive Colors works differently. Every swatch is blended with one shared key colour in OKLab, the way a single light source ties a photograph together. A contrast guard keeps neighbouring swatches apart, and the set is laid out as a clean lightness ramp from light to dark. The result reads as one object, not a row of unrelated tiles.

GENERATE
• Pick the exact size your design system needs: 3, 4, 5, 6, 7, 8, 9 or 10 swatches
• Choose a harmony: analogous, complementary, split-complementary, triadic, tetradic or monochrome — or let it surprise you
• 12 key colours (Golden Hour, Terracotta, Sea Glass, Deep Ocean, Violet Dusk, Moss and more) plus a cohesion-strength slider
• Lock the swatches you like and press Space to regenerate the rest

FROM PAGE
• Pull the palette any website actually uses: backgrounds, text, borders and icons
• Reduce it to 3–10 representative colours with one click
• Optionally make it cohesive with your key colour, so a messy site palette becomes a usable brand palette
• The page is read only when you open this tab, and only the current tab

EXPLORE & SAVE
• 480 hand-picked palettes, searchable by name, mood or #hex code
• Filter by palette size to find exactly 4, 7 or 10 colours
• Send any palette to the generator to tweak it
• Save favourites in the add-on; they stay on your device

COPY & EXPORT
• Click any swatch to copy it as HEX, RGB, HSL or OKLCH
• Copy a whole palette as CSS variables, a Tailwind v4 theme, SCSS, JSON, Swift, Android XML or SVG
• Open any palette on cohesive-colors.github.io for the contrast matrix, image export and sharing links

PRIVATE BY DESIGN
No account, no ads, no analytics, no tracking. Nothing is sent to a server. Your saved palettes and settings live in the add-on's local storage and are removed when you uninstall it.

Keyboard shortcut: Alt+Shift+C opens the popup. Change it in about:addons → ⚙ → Manage Extension Shortcuts.
```

**Categories** (up to 2): `Web Development`. Add a second only if one clearly
fits — AMO advises against padding.

**Tags**: `color`, `palette`, `design`, `css`, `tailwind`, `color picker`,
`web development`, `ui`

**Support email**: your public support address (shown on the listing).
**Support website**: `https://cohesive-colors.github.io/about/`

**License**: `All Rights Reserved` (or an open licence such as MIT if you plan
to open-source the extension).

**Privacy policy**: optional for an add-on that collects nothing. To add one,
paste the "Browser extension" section of `/privacy` — AMO requires the policy
text in its own field, not a link.

**Notes to reviewer**:

```
The add-on is a toolbar popup with no background script and no host permissions. It uses activeTab + scripting only for the "From page" tab: after the user opens it, scripting.executeScript runs scanPage() (extensions/browser/src/extract.ts) in the current tab, which reads computed CSS colours and returns them to the popup. Nothing is transmitted; data_collection_permissions is set to "none".

The code is bundled with Vite (React + Tailwind) but shipped unminified. The source package contains SOURCE_BUILD.md: `npm ci --ignore-scripts` at the root, then `npm ci && npm run build:firefox` in extensions/browser reproduces dist/firefox exactly.

addons-linter reports two UNSAFE_VAR_ASSIGNMENT warnings for innerHTML. Both are inside react-dom (its dangerouslySetInnerHTML and SVG namespace handling); the add-on's own code never uses innerHTML.
```

**Screenshots** (`store-assets/`, 1280×800): `screenshot-1-generate.png`,
`screenshot-2-from-page.png`, `screenshot-3-explore.png`,
`screenshot-4-saved.png`. Captions:

1. Palettes of 3 to 10 colours that belong together
2. Grab the palette of any website
3. 480 curated palettes, filtered by size
4. Save, then export to code

Submit. Listed add-ons with source code usually get a human review within a few
days; the automatic signing happens first, so the version may show as "signed"
before the listing is public.

## Updates

1. Bump `version` in `package.json`.
2. `npm run zip:firefox`.
3. AMO → your add-on → **Upload New Version** → upload both zips again (the
   source package is required for every version).

## Testing locally

```powershell
cd extensions/browser
npm run build:firefox
npm run run:firefox   # opens your Firefox with the add-on loaded
```

Or by hand: `about:debugging#/runtime/this-firefox` → **Load Temporary
Add-on…** → pick `dist/firefox/manifest.json`. A temporary add-on is removed
when Firefox restarts.
