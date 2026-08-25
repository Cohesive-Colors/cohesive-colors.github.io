# Cohesive Colors

A colour palette feed and generator built on one idea: a palette should not be a
row of unrelated hex codes. Every palette here is run through a **cohesion
pass** — one shared key colour composited over all of its swatches in linear
sRGB, lightness restored in OKLab, hue pulled toward a common axis in OKLCH —
and then repaired by contrast and vibrancy guards.

Palettes carry **3 to 10 swatches**, not a fixed four.

Astro · React islands · Tailwind CSS v4 · culori.

## Getting started

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run test       # colour-maths and feed unit tests
npm run seed       # re-curate src/lib/data/palettes.json
npm run icons      # rebuild favicons, PWA icons and the OG card
```

## The algorithm

`src/lib/color/` is a self-contained, framework-free colour engine. The pipeline
runs in three stages:

**1 · Base generation** — `harmony.ts`

A harmony is chosen (analogous, complementary, split-complementary, triadic,
tetradic, monochrome, or a bounded random set) and swatches are laid out along
an eased lightness ramp with a chroma arc that peaks in the middle of the ramp.
`random` still samples inside a window around the base hue; a uniform hue draw
produces exactly the clashes this project exists to remove.

**2 · Cohesion layer** — `cohesion.ts`

The key colour is composited over every swatch in *linear* sRGB — the maths an
image editor uses for a blend layer — at 10–35% strength, in `overlay`,
`soft-light`, `multiply`, `screen` or plain `mix`. Each swatch is then dragged
back toward its original OKLab lightness (`preserveLightness`), which is what
stops the palette collapsing into one flat tone.

Channel blends cannot move a clipped primary — `overlay` on pure red is a no-op
— so an explicit **hue pull** in OKLCH nudges every swatch toward the key hue.
That is what guarantees a shared axis regardless of blend mode.

**3 · Contrast & vibrancy guards** — `cohesion.ts`

A heavy overlay costs both separation and chroma.

- `enforceContrast` sorts by lightness and pushes neighbours apart until every
  adjacent pair clears `minDeltaL`; if there is not enough room it rebuilds an
  even ramp around the original mid-point.
- `enforceVibrancy` scales mean chroma back up toward a target — upward only,
  and clamped by a binary search for the largest chroma sRGB can actually show
  at that lightness and hue, so the fix never shifts hue.

Finally the palette is ordered into a clean lightness ramp, which is what makes
a card read as one object rather than a row of tiles.

## Project structure

```
src/
├── lib/
│   ├── color/          the engine — no React, no DOM
│   │   ├── types.ts        shared types
│   │   ├── core.ts         OKLCH/OKLab/linear-sRGB conversion, gamut, WCAG
│   │   ├── random.ts       seeded PRNG (mulberry32)
│   │   ├── harmony.ts      stage 1 — harmonies and mood presets
│   │   ├── cohesion.ts     stages 2 and 3 — overlay, contrast, vibrancy
│   │   ├── naming.ts       hue families, palette names, mood classification
│   │   ├── palette.ts      generatePalette / recohere / locks
│   │   └── export.ts       CSS, Tailwind, SCSS, JSON, Swift, Android, SVG
│   ├── data/           curated seed feed (generated, committed)
│   ├── feed.ts         filtering and tab sorting — pure, unit-tested
│   ├── clipboard.ts    copy with a legacy fallback
│   ├── download.ts     text, SVG and canvas-rasterised PNG downloads
│   └── time.ts         "3 days" style relative ages
├── store/              zustand: filters, overlay, favourites (localStorage)
├── components/
│   ├── astro/          static nav and footer
│   └── react/          the islands
├── layouts/
└── pages/              /  ·  /generator  ·  /saved  ·  /about
                        /palette/[id]  — 480 prerendered palette pages
                        /palette/view  — rebuilds a palette from the URL
scripts/
├── generate-seed.mjs   curates the seed feed
└── generate-icons.py   derives every favicon / PWA / OG asset from one source
tests/                  node:test suites for the engine and the feed
```

## Deploying

The site is static, so any file host serves it. The configured target is GitHub
Pages at `https://cohesive-colors.github.io`, published by
`.github/workflows/deploy.yml` on every push to `main`. Full setup, including
the Firebase variables and the domain authorisation that likes depend on, is in
[DEPLOY.md](DEPLOY.md).

`og:image`, `og:url`, the canonical link, the sitemap and the Pinterest media
URL are all absolute and derive from `site` in `astro.config.mjs`, which
defaults to the production origin. Override it for a preview deploy:

```sh
PUBLIC_SITE_URL=https://preview.example npm run build
```

If you regenerate the seed (`npm run seed`), every palette gets a new id.
Palettes imported into Firebase from the previous set become orphans: they
still win in the feed, have no prebuilt images, and their links fall back to
`/palette/view`. Clean them up with

```sh
npm run prune:firebase            # dry run
npm run prune:firebase -- --apply
```

which only removes rows the importer wrote (`author: "seed"`) that are missing
from the current `palettes.json` — anything a person published is left alone.

`npm run build` also runs `npm run images:palettes`, which renders two social
images per curated palette into `public/social/` (git-ignored, ~9 MB, ~2 min on
a cold run and instant afterwards — it only fills gaps). Pass `--force` after
changing the card design.

## Pinterest

The site is static, so only curated palettes can be pinned: Pinterest fetches
`image_url` itself and ignores `data:` and `blob:` sources. What that buys:

- **Three card layouts per palette** (`stripes`, `blocks`, `hero`). Pinterest
  treats a repeat of the same image as a duplicate, so variants let one page be
  pinned again months later. The page lets you pick which one to pin.
- **Rich Pins** — palette pages are `og:type=article` with `og:image:alt` and
  `article:published_time`, so the pin carries a real title and description.
- **A sitemap** for all 485 pages, via `@astrojs/sitemap`.
- **Bulk upload** — 1440 scheduled pins as CSV:

  ```sh
  npm run pins:csv -- \
    --board "Color Palettes" --per-day 12 --start 2026-09-01
  ```

  Writes `pinterest/pins-NN.csv` (150 rows each, Pinterest caps at 200) with the
  headers it expects: `board_name,title,description,link,image_url,published_at`.
  Layout is the outer loop, so all 480 `stripes` pins go out before the first
  `blocks` one — roughly forty days between two pins of the same palette, with
  different wording each time. Upload under Create → Bulk create Pins; the board
  has to exist first.

Pinning user-published palettes would need images hosted at a URL, i.e. a
serverless render endpoint or object storage. Firebase Storage no longer has a
no-cost tier for new projects, so that path means moving off the Spark plan.

## SEO

- **Readable URLs**: `/palette/whispers-of-copper-palette-88yb6z-4`. The slug is
  generated with the palette and travels with it, so nothing has to parse an id
  back out of a URL.
- **No orphans**: `/palettes` paginates the whole collection, and
  `/palettes/hue/*`, `/palettes/mood/*`, `/palettes/size/*` group it three ways.
  Every palette page has at least four inbound links from static HTML; the hubs
  double as landing pages for searches like "orange color palette".
- **Unique names**: the seed generator disambiguates collisions, because two
  palettes called "Poppy Drift" mean two identical `<title>` tags.
- **Descriptions** are written long and trimmed to 158 characters by
  `clampMeta`, so nothing useful lands past Google's cut.
- **Structured data**: `BreadcrumbList` plus `CreativeWork` with an `ImageObject`
  on palette pages, `CollectionPage` with an `ItemList` on the hubs, `WebSite` on
  the home page.
- **`robots.txt` and `llms.txt`** are generated routes, so the sitemap URL and
  the site map for language models always match the deployed origin.
- `/palette/view` and `/saved` are `noindex` and excluded from the sitemap:
  both render from client state, so a crawler would find nothing there.

Check it after any change with the two scripts used to build it:

```sh
npm run build && node scripts/audit-seo.mjs
```

## Palette links

Every palette is linkable, including ones that were never saved anywhere:

| Palette | Link |
| --- | --- |
| Curated | `/palette/{id}` — prerendered at build time, real HTML for crawlers |
| Published | `/palette/view?c=…&id=…` — colours render immediately, the live like count arrives with the feed |
| Just generated | `/palette/view?c=553a11-00606e-…` — the colours *are* the link |

Only curated palettes have hosted social images, so only they can be pinned:
Pinterest fetches the image by URL and ignores `data:` and `blob:` sources.
Everything else renders the same card client-side, which can be downloaded and
uploaded by hand. Hosting images for user-published palettes would need an
image endpoint, i.e. a server.

That last row is the reason the colours travel in the URL rather than behind an
id: a generated palette exists only in the browser that made it, and a link
that needs a database would be dead on arrival. Truncated links are rejected
rather than half-rendered.

## Features

- **Feed tabs** — New, Popular, Random, Harmonized, Muted Moods, Vibrant Cohesive
- **Global cohesion controller** — swap the key colour, drag overlay strength,
  lightness preservation, hue pull and blend mode; the whole feed re-blends live
- **Filters** — free text, hex prefix, dominant hue family, swatch count, mood
- **Cards** — click any stripe to copy, like and bookmark to localStorage
- **Editor** — full WCAG 2.1 contrast matrix, per-swatch text safety, cohesive vs
  un-cohesive comparison, per-palette cohesion controls
- **Exports** — CSS variables, Tailwind v4 `@theme`, SCSS, JSON, Swift, Android
  XML, plus SVG and PNG swatch cards
- **Generator** — pin swatches, press <kbd>Space</kbd> to rebuild the rest around
  them, resize the palette from 3 to 10
- **Shareable pages** — every palette has a URL; curated ones are prerendered
  with their own title, description and JSON-LD, live key-colour preview

## Shared likes (optional Firebase)

Without any configuration the app is fully static: the bundled seed feed, likes
and bookmarks in `localStorage`. Adding a Firebase Realtime Database turns likes
into shared counters and lets people publish palettes to a common feed.
**Bookmarks stay local either way** — they are a private shortlist, not content.

### Setup

Everything below fits in the no-cost Spark plan — no card, no Blaze upgrade.

1. **Create the project** at <https://console.firebase.google.com> → *Add
   project*. Analytics is not needed.

2. **Realtime Database** — <https://console.firebase.google.com/project/_/database>
   (`_` resolves to your current project). In the sidebar it lives under
   *Databases & Storage*; older guides say *Build*, which no longer exists.
   The page offers both databases — pick **Realtime Database**, not Firestore —
   then *Create database*, a region close to your users, and **locked mode**.
   The rules in this repo replace the defaults in step 5.

3. **Anonymous sign-in** — <https://console.firebase.google.com/project/_/authentication/providers>
   (sidebar: *Security → Authentication*). Enable the **Anonymous** provider.
   Turn on the automatic clean-up of anonymous accounts older than 30 days while
   you are there; a returning visitor simply gets a new id and can like again,
   which is the correct trade-off for a site with no accounts.

4. **Register a web app**: Project settings → *Your apps* → the `</>` icon
   (or *Add app* on the project overview).
   On that page, under *SDK setup and configuration*, pick **Config** — you get
   a `firebaseConfig` object. Save it to a file and let the importer write
   `.env` for you rather than copying five values by hand:

   ```sh
   node scripts/env-from-config.mjs firebase-config.txt
   ```

   `databaseURL` is the one people get wrong — it must be the full
   `https://<project>-default-rtdb.<region>.firebasedatabase.app`, shown at the
   top of the Realtime Database page. It only appears in the snippet if the
   database already existed when the app was registered; if it is absent, the
   importer says so and you paste that one line yourself.

5. **Deploy the rules.** The quickest path needs no CLI at all: open Realtime
   Database → **Rules**, paste the contents of `database.rules.json`, Publish.

   With the CLI, note the package is `firebase-tools`, and its binary is called
   `firebase`. This project depends on `firebase` (the client SDK, which has no
   binary), so a bare `npx firebase …` resolves to that and fails with
   *"could not determine executable to run"*. Name the tools package:

   ```sh
   npx --yes firebase-tools login
   npx --yes firebase-tools use --add     # pick the project
   npm run rules:deploy
   ```

   Or install it once, globally, and use the short name everywhere:

   ```sh
   npm i -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy --only database
   ```

6. **Import the curated feed** so "Popular" has something to rank. Download a
   service-account key from Project settings → *Service accounts* → *Generate new
   private key*, save it as `serviceAccountKey.json` (already git-ignored), then:

   ```sh
   npm i -D firebase-admin
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run seed:firebase
   ```

7. **Verify the whole thing**:

   ```sh
   npm run check:firebase
   ```

   It checks the config, signs in anonymously, reads the feed, and then tries
   six writes that the rules must reject or allow — including liking the same
   palette twice. It is net-zero (every like it makes it takes back), so it is
   safe to run against production.

### Data model

```
/palettes/{id}          name, colors[], raw[], harmony, hue, moods[],
                        cohesion{}, seed, createdAt, author, likes
/userLikes/{uid}/{id}   true
/lastPublish/{uid}      timestamp
```

A like is **one atomic multi-path update** that writes both the counter and the
user's own entry under `/userLikes`. That pairing is what the rules check: the
counter may only move by ±1, and only in the direction matching whether this
user's entry exists after the write. Incrementing without liking is rejected, so
one anonymous user can like a palette exactly once — enforced on the server, not
just hidden in the UI.

Palettes are immutable once published: `$id` is writable only when it does not
exist, and `likes` is the sole field with its own write rule.

### Verifying the rules

`npm run check:firebase` is the fast path. To iterate on the rules without
touching a live project:

```sh
npm run emulate        # database + auth emulators, UI on :4000
```

### Behaviour when it is off

`src/lib/firebase/client.ts` returns `null` whenever the env vars are missing or
sign-in fails, and every caller treats that as "stay local". The SDK is loaded
through dynamic `import()`, so a visitor without Firebase configured never
downloads it — the feed renders from the static seed on the first paint either
way.

## Brand assets

`src/assets/brand/icon-source.png` is the master render; everything shipped in
`public/` is derived from it by `npm run icons` (needs Python + Pillow, and
ImageMagick for the `.ico`):

| File | Used for |
| --- | --- |
| `favicon.svg` | primary favicon — vector, hairlines dropped so it survives 16px |
| `favicon.ico` | 48/32/16 multi-resolution, legacy tabs and Windows pins |
| `icon-16/32/48/192/512.png` | generic PNG mark, transparent corners |
| `apple-touch-icon.png` | 180px, opaque — iOS applies its own mask |
| `icon-512-maskable.png` | Android adaptive icon, mark inside the 62% safe circle |
| `og-image.png` | 1200×630 social card |
| `site.webmanifest` | PWA install metadata |

`src/assets/brand/logo.svg` is the same mark with the hairline separators kept,
for use above ~64px.

## Notes

- Everything is static. Likes and bookmarks live in `localStorage`; nothing is
  sent anywhere.
- `src/lib/data/palettes.json` is generated. `npm run seed` sweeps every swatch
  count, harmony and mood preset, scores candidates on ramp evenness, vibrancy,
  contrast range and hue coherence, and keeps the winners under hue-bucket
  quotas so the feed is not dominated by whichever hues score best.
- The engine is deterministic: the same seed always rebuilds the same palette.
