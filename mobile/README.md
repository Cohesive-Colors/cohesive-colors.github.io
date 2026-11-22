# Cohesive Colors — Android app

Expo (SDK 57) + React Native + Expo Router. It lives inside the site's repo
and **imports the site's code directly**: the colour engine, feed filtering and
sorting, the 480 curated palettes, the export formats and the Firebase
like/publish code exist once, in `../src`, and both apps use them.

```
mobile/
  src/app/              screens (Expo Router: every file is a route)
    (tabs)/index.tsx    Palettes feed: tabs, 3–10 colour filter, hue, mood, search
    (tabs)/generate.tsx Generator: 3–10 swatches, pin/lock, exact hex, harmony, cohesion
    (tabs)/saved.tsx    Bookmarks, stored on the device
    (tabs)/about.tsx    Status, website, privacy policy, clear data
    palette/[id].tsx    Palette: HEX/RGB/OKLCH copy, like, save, share, remix, export, contrast
    cohesion.tsx        Feed-wide cohesion overlay
  src/components/       UI pieces
  src/shims/            mobile versions of src/lib/firebase/{config,client}.ts
  src/store/            mobile useAppStore (AsyncStorage) + palette registry
  plugins/              config plugin that signs local release builds
  scripts/              generate-assets.py (icons, splash, store graphics)
  store/                Play Store icon, feature graphic, draft screenshots
```

## How the sharing works

`metro.config.js` resolves `@/…` to `../src/…`. Three web-only modules are
swapped for mobile ones (same exports):

| site module                  | mobile replacement                 | why                                   |
| ---------------------------- | ---------------------------------- | ------------------------------------- |
| `@/lib/firebase/config`      | `src/shims/firebase-config.ts`     | `EXPO_PUBLIC_*` instead of `import.meta.env` |
| `@/lib/firebase/client`      | `src/shims/firebase-client.ts`     | auth persisted in AsyncStorage, so one install = one anonymous uid |
| `@/store/useAppStore`        | `src/store/useAppStore.ts`         | AsyncStorage, and Saved keeps full palettes |

`tsconfig.json` has the same mapping, so `npm run typecheck` checks the shared
files too. Bare imports made from `../src` (culori, zustand, firebase) are
resolved from **this** folder's `node_modules` — the site's own React would
otherwise be a second copy and break hooks.

Consequences worth remembering:

- Change the engine in `../src/lib/color` and both apps change. Re-run
  `npm run seed` at the root as before; the app bundles the same JSON.
- Keep `src/lib/**` free of DOM APIs (`window`, `document`, `localStorage`) —
  the app runs it on Hermes. The site's CLAUDE.md already asks for this.
- The like/publish code in `src/lib/firebase/feed.ts` is shared, so the
  database rules and `npm run check:firebase` cover the app too.

## Setup (Windows, PowerShell)

```powershell
cd C:\Users\anlib\Desktop\micro-projects\cohesive-colors\mobile
npm install
```

`.env` here holds the Firebase web config with `EXPO_PUBLIC_` prefixes (copied
from the site's `.env`). Without it the app runs offline: bundled palettes,
likes on the device, no publishing.

## Run on a phone or emulator

The app uses native modules outside Expo Go (slider, async-storage), so run a
development build:

```powershell
npm run android            # = expo run:android — builds, installs, starts Metro
```

Needs Android Studio's SDK and either an emulator or a phone with USB
debugging on. After the first build, `npm start` is enough while you edit JS.

`npm run web` opens the same app in a browser — handy for quick UI checks.

## Checks

```powershell
npm run typecheck          # tsc over the app and the shared site code
npx expo-doctor            # dependency / config sanity
npx expo export --platform android   # proves the release JS bundle builds
```

## Release build

See [PLAY_STORE.md](./PLAY_STORE.md) for the full Google Play checklist.

## Icons and splash

`npm run assets` (needs Python + Pillow) rebuilds everything in `assets/` and
`store/` from `../src/assets/brand/icon-source.png`, the same source the site
uses. Run it after changing the brand mark.
