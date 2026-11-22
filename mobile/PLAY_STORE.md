# Publishing to Google Play

Package name: **`com.cohesivecolors.app`** (in `app.json`). It is permanent
once the first build is uploaded — change it now if you want a different one.

## 0. Before the first upload

1. **Deploy the site** with the new `/privacy` page (`src/pages/privacy.astro`).
   Play requires a public privacy policy URL:
   `https://cohesive-colors.github.io/privacy/`
2. **Google Play developer account** (one-time $25) at
   https://play.google.com/console. Personal accounts created after
   November 2023 must run a **closed test with at least 12 testers for 14
   days** before production access is granted — plan for it.
3. In Play Console, **Create app** → name "Cohesive Colors", App, Free.

## 1. Build the AAB

Play takes an Android App Bundle (`.aab`), signed with your **upload key**.
Google re-signs it for delivery (Play App Signing). Two ways:

### A. EAS Build (simplest, nothing to install, key managed for you)

```powershell
cd mobile
npx eas-cli@latest login            # free Expo account
npx eas-cli@latest init             # links the project, writes projectId into app.json
npm run build:aab                   # eas build -p android --profile production
```

The first run asks to generate a keystore — say yes; EAS stores it. The
finished `.aab` link appears in the terminal. `npm run build:apk` makes an
installable APK of the same build for your own phone.

Note: EAS builds in the cloud and does not see your local `.env`. Add the
`EXPO_PUBLIC_FIREBASE_*` and `EXPO_PUBLIC_SITE_URL` values on
expo.dev → project → **Environment variables** (environment "production"),
or the store build runs in offline mode.

### B. Locally with Android Studio's SDK

1. Create an upload key once, and keep it **outside the repo** with a backup —
   losing it means asking Google for an upload-key reset:

   ```powershell
   keytool -genkeypair -v -storetype PKCS12 -keystore C:\Users\anlib\keys\cohesive-upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```

   (`keytool` ships with Android Studio: `"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"`.)

2. Tell Gradle where it is, in `C:\Users\anlib\.gradle\gradle.properties`:

   ```properties
   COHESIVE_UPLOAD_STORE_FILE=C:/Users/anlib/keys/cohesive-upload.keystore
   COHESIVE_UPLOAD_STORE_PASSWORD=...
   COHESIVE_UPLOAD_KEY_ALIAS=upload
   COHESIVE_UPLOAD_KEY_PASSWORD=...
   ```

   `plugins/withReleaseSigning.js` wires these into every generated
   `android/app/build.gradle`, so it survives `expo prebuild --clean`.

3. Build:

   ```powershell
   cd mobile
   npm run native:android                     # expo prebuild --platform android --clean
   cd android
   .\gradlew bundleRelease
   ```

   Output: `android\app\build\outputs\bundle\release\app-release.aab`.

   To try the release build on a phone first: `npm run android:release`.

## 2. Every later release

Bump both in `app.json`, then build again:

- `expo.version` — what users see (`1.0.1`)
- `expo.android.versionCode` — integer, **must increase** every upload (`2`)

## 3. Store listing (Grow → Store presence → Main store listing)

**App name** (30 max): `Cohesive Colors`

**Short description** (80 max):
`Color palettes from 3 to 10 shades, held together by one key color.`

**Full description:**

```
Cohesive Colors is a palette browser and generator built around one idea: every color in a palette should feel lit by the same light.

• Palettes with 3 to 10 colors — filter the feed by exact size, not just "five swatches".
• Hundreds of curated palettes, filterable by hue, mood (Pastel, Nordic, Cyberpunk, Earthy…) and harmony.
• Generator: lock the colors you like, pin an exact hex, add or remove swatches, pick a harmony and regenerate the rest.
• Cohesion overlay: lay one key color over every palette and watch the whole feed shift mood without losing contrast.
• Copy any swatch as HEX, RGB or OKLCH with a tap.
• Export to CSS variables, Tailwind v4, SCSS, JSON, Swift, Android XML or SVG.
• WCAG contrast matrix for every pair, plus the best text pairing.
• Save palettes on your phone — they work offline.
• Like and publish palettes to a shared feed. No account, no ads, no tracking.
```

**Graphics** (all in `store/`):

| asset                | file                                  | spec                    |
| -------------------- | ------------------------------------- | ----------------------- |
| App icon             | `store/play-icon-512.png`             | 512×512 PNG             |
| Feature graphic      | `store/feature-graphic-1024x500.png`  | 1024×500                |
| Phone screenshots    | `store/screenshots/*.png`             | 1080×1920, 2–8 required |

The screenshots are rendered from the app's web build. They match the
Android UI closely; replace them with captures from a real device
(Android Studio → Running Devices → camera icon) if you prefer.

**Category:** Art & Design. **Tags:** colors, design, palette.
**Contact email:** required, shown publicly.

## 4. App content (Policy → App content)

- **Privacy policy:** `https://cohesive-colors.github.io/privacy/`
- **Ads:** No ads.
- **App access:** All functionality available without special access.
- **Content rating:** questionnaire → category "Utility, Productivity,
  Communication, or Other"; answer No to everything. Users can publish palettes
  (colors + an auto-generated name, no free text), so "user-generated content"
  is minimal — answer honestly if asked about sharing content between users: yes,
  palettes only.
- **Target audience:** 18+ (or 13+); not designed for children.
- **Data safety** — matches what the code does:
  - Data collected: **Yes**.
  - *App activity → Other user-generated content* (published palettes and likes):
    collected, not shared, not optional for publishing, purpose **App functionality**.
  - *Device or other IDs*: the Firebase anonymous user ID — collected, purpose
    **App functionality**, not used for tracking.
  - Data encrypted in transit: **Yes** (Firebase uses HTTPS).
  - Users can request deletion: **Yes** — via the contact email (see privacy policy).
  - No location, contacts, personal info, financial info, photos, files,
    health, messages, audio, web history or analytics.
- **Government apps / financial features / health:** No.

If you ever add analytics, crash reporting or ads, update both this form and
`src/pages/privacy.astro`.

## 5. Release

1. **Testing → Closed testing** → create a track, add testers (an email list
   or a Google Group), upload the `.aab`, roll out. Testers opt in via the link.
2. After the 14 days with 12+ testers (new personal accounts), **apply for
   production access** in the dashboard.
3. **Production** → Create release → upload (or promote) the bundle → review.

`eas.json` also has a `submit` profile (`npx eas-cli submit -p android`) that
uploads to the internal track as a draft — it needs a Google service-account
key, set up once in Play Console → Setup → API access.
