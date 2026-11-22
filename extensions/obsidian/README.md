# Cohesive Colors

Generate colour palettes of 3 to 10 swatches that belong together, browse 480
curated palettes, and keep them in your notes as live swatches you can click
to copy.

Every palette is built the way [cohesive-colors.github.io](https://cohesive-colors.github.io)
builds them: swatches from a colour harmony are blended with one shared key
colour in OKLab, kept apart by a contrast guard and laid out as a lightness
ramp. The set reads as one palette instead of a row of unrelated colours.

## Features

- **Swatch blocks.** A fenced `cohesive-palette` block renders as colour
  stripes with their hex codes. Click a stripe to copy the colour as HEX, RGB,
  HSL or OKLCH.
- **Generator.** Pick 3 to 10 swatches, a harmony, a key colour and the
  cohesion strength. Lock the colours you like and regenerate the rest.
- **Curated palettes.** Search 480 palettes by name, mood, size or hex code
  and insert one at the cursor.
- **Edit in place.** The pencil on a swatch block opens it in the generator;
  **Update block** writes the new colours back into the note.
- **Export.** Copy any palette as CSS variables, Tailwind v4, SCSS, JSON,
  Swift, Android XML or SVG.
- **From your own notes.** Select text containing hex codes and run
  *Turn selected hex codes into a swatch block*.

Works on desktop and mobile. No account, no network requests, nothing leaves
your vault. The only outbound links are the ones you click to open a palette
on the website.

## Usage

Open the command palette and run one of:

| Command | What it does |
|---|---|
| Cohesive Colors: Generate palette | Opens the generator; **Insert** adds the palette at the cursor |
| Cohesive Colors: Browse curated palettes | Search the curated set; Enter inserts, Shift+Enter opens it in the generator first |
| Cohesive Colors: Turn selected hex codes into a swatch block | Converts the selection into a block |

The palette icon in the ribbon opens the generator too. No hotkeys are set by
default; assign your own under **Settings → Hotkeys**.

A swatch block is plain text, so it survives export, sync and other editors:

````markdown
```cohesive-palette
Terracotta Dusk
#ffdcc5 #e59388 #c66942 #683733 #1f2a44
```
````

The first line without a hex code is the name. Hex codes can be separated by
spaces, commas or new lines, and `#abc` short codes work too.

## Settings

| Setting | Default | |
|---|---|---|
| Insert palettes as | Swatch block | Or a bulleted list of hex codes, or hex codes on one line |
| Copy colours as | HEX | Format used when you click a swatch |
| Default palette size | 5 colours | Size the generator starts with |
| Show hex codes on swatches | On | Labels under each stripe in rendered blocks |

## Installation

From Obsidian: **Settings → Community plugins → Browse**, search for
"Cohesive Colors", install and enable.

Manually: download `main.js`, `manifest.json` and `styles.css` from the
latest [release](../../releases) into `<vault>/.obsidian/plugins/cohesive-colors/`,
then enable the plugin under **Settings → Community plugins**.

## Development

```sh
npm install
npm run dev     # rebuilds main.js on save
npm run build   # type-check + production build
npm run lint    # eslint-plugin-obsidianmd, the rules community review uses
```

`src/engine/` is a copy of the colour engine and curated palettes from the
Cohesive Colors website, synced with `npm run sync-engine` inside the website's
repository. Fix engine issues there, not here.

Releases: bump the version with `npm version patch --no-git-tag-version`
(updates `manifest.json` and `versions.json`), tag the commit with the bare
version (`1.0.1`, no `v`), push the tag, and publish the draft release the
workflow creates.

## License

[MIT](LICENSE)
