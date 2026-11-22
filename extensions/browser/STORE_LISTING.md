# Chrome Web Store — submission kit

Everything the developer dashboard asks for, in the order it asks. Copy the
blocks as they are. Images are in `store-assets/`.

## 0. Before the first upload

1. **Deploy the site** so the updated `/privacy` page (it now has a "Browser
   extension" section) is live: `https://cohesive-colors.github.io/privacy/`.
2. **Developer account**: https://chrome.google.com/webstore/devconsole —
   one-time $5 fee, Google account with 2-Step Verification.
   - The publisher name shown on the listing is editable under
     *Account → Publisher name*. To keep your personal name off the listing,
     set it to "Cohesive Colors". The store still asks you to verify a contact
     email; it is not shown publicly unless you choose to.
   - Trader / non-trader declaration (EU DSA): a free extension with no
     monetisation can be declared **non-trader**, which keeps your address off
     the listing.
3. Build the package:

   ```powershell
   cd extensions/browser
   npm run zip
   ```

   Upload `release/cohesive-colors-chrome-1.0.0.zip`.

## 1. Package → Store listing

**Name** (from the manifest, max 75): `Cohesive Colors — Palette Generator`

**Summary** (from the manifest, max 132):

```
Generate cohesive colour palettes of 3 to 10 swatches, pull the palette out of any web page, and copy it as CSS, Tailwind or JSON.
```

**Description** (store minimum 1,500 characters; this one is ~2,360):

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
• Save favourites in the extension; they stay on your device

COPY & EXPORT
• Click any swatch to copy it as HEX, RGB, HSL or OKLCH
• Copy a whole palette as CSS variables, a Tailwind v4 theme, SCSS, JSON, Swift, Android XML or SVG
• Open any palette on cohesive-colors.github.io for the contrast matrix, image export and sharing links

WHO IT IS FOR
UI and web designers building design systems, front-end developers who want ready-to-paste Tailwind or CSS tokens, brand designers exploring colour directions, and anyone who needs a palette that looks deliberate in seconds.

PRIVATE BY DESIGN
No account, no ads, no analytics, no tracking. Nothing is sent to a server. Your saved palettes and settings live in your browser's extension storage and are removed when you uninstall.

Keyboard shortcut: Alt+Shift+C opens the popup (change it at chrome://extensions/shortcuts).
```

**Category**: `Tools` (alternative: `Art & Design` if offered for your region)

**Language**: English

**Graphic assets** (`store-assets/`):

| Field | File | Size |
|---|---|---|
| Store icon | `../public/icons/icon-128.png` | 128×128 |
| Screenshots (up to 5) | `screenshot-1-generate.png` … `screenshot-4-saved.png` | 1280×800 |
| Small promo tile (required) | `promo-small-440x280.png` | 440×280 |
| Marquee promo tile (optional) | `promo-marquee-1400x560.png` | 1400×560 |

**Official URL**: leave empty unless you verify the domain in Search Console.
**Homepage URL**: `https://cohesive-colors.github.io/`
**Support URL**: `https://cohesive-colors.github.io/about/` (or a GitHub issues URL)

## 2. Privacy practices tab

**Single purpose**:

```
Create colour palettes: generate cohesive palettes of 3–10 colours, extract the palette used by the current web page, and copy palettes as colour codes.
```

**Permission justifications**:

- `activeTab`:
  ```
  When the user opens the "From page" tab, the extension reads the colours used by the page in the current tab to build a palette from them. Access is limited to that tab, only after the user clicks the extension.
  ```
- `scripting`:
  ```
  Used together with activeTab to run a function in the current tab that reads computed CSS colours (background, text, border, SVG fill). It reads no text content, form data or other page data, and the result is only shown in the popup.
  ```
- `storage`:
  ```
  Stores the user's saved palettes and generator settings locally so they persist between popup openings. Nothing is synced or sent to a server.
  ```
- **Host permissions**: none requested.
- **Remote code**: `No, I am not using remote code.` (everything is bundled; no
  scripts are fetched at runtime).

**Data usage** — tick nothing in the "collects" list (the extension collects no
user data). Then tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**: `https://cohesive-colors.github.io/privacy/`

## 3. Distribution

- Visibility: **Public**
- Regions: all
- Pricing: free

Submit for review. First reviews usually take a few days; an extension with
`activeTab` + `scripting` and no host permissions is in the lightest review
bucket.

## Updates

1. Bump `version` in `package.json`.
2. `npm run zip`.
3. Dashboard → Package → **Upload new package** → submit.

## Edge Add-ons (same package)

https://partner.microsoft.com/dashboard/microsoftedge — free account. Upload the
same zip; reuse the description, screenshots and privacy answers above. Edge
asks for a 300×300 logo: `store-assets/edge-logo-300.png`.
