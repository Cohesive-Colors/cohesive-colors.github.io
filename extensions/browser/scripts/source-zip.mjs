// Builds the source-code package addons.mozilla.org asks for when the uploaded
// code is bundled (https://extensionworkshop.com/documentation/publish/source-code-submission/).
// The reviewer must be able to rebuild dist/firefox from it byte for byte, so
// it carries everything the build reads: this folder, the site's src/lib that
// the `@/…` alias points at, and both lockfiles.
//
//   node scripts/source-zip.mjs → release/cohesive-colors-firefox-<v>-source.zip
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import yazl from 'yazl';

const ext = fileURLToPath(new URL('..', import.meta.url));
const repo = join(ext, '..', '..');
const { version } = JSON.parse(readFileSync(join(ext, 'package.json'), 'utf8'));

if (!existsSync(join(ext, 'package-lock.json'))) {
  console.error('extensions/browser/package-lock.json is missing — run `npm install` in this folder first,');
  console.error('so the reviewer installs exactly the versions you built with.');
  process.exit(1);
}

// Never packed, wherever they appear.
const SKIP = new Set(['node_modules', 'dist', 'release', 'store-assets', '.env', '.DS_Store']);

const zip = new yazl.ZipFile();
const add = (abs) => {
  const rel = relative(repo, abs).split('\\').join('/');
  if (statSync(abs).isDirectory()) {
    for (const name of readdirSync(abs)) if (!SKIP.has(name)) add(join(abs, name));
  } else {
    zip.addFile(abs, rel);
  }
};

for (const p of ['package.json', 'package-lock.json', 'tsconfig.json', 'src/lib', 'extensions/browser']) {
  add(join(repo, p));
}

const instructions = `# Cohesive Colors for Firefox — build from source

Version ${version}. This archive rebuilds the uploaded add-on exactly.

## Environment

- Any OS (Windows, macOS or Linux)
- Node.js 22 LTS (22.12 or newer) with npm 10

## Steps

\`\`\`sh
# 1. dependencies of the shared colour engine (culori), from the repo root
npm ci --ignore-scripts

# 2. dependencies of the extension
cd extensions/browser
npm ci

# 3. build
npm run build:firefox
\`\`\`

The add-on is written to \`extensions/browser/dist/firefox/\`. Its contents are
identical to the uploaded package.

## Layout

- \`extensions/browser/src/\` — the popup (React + Tailwind), entry \`src/main.tsx\`.
- \`src/lib/color/\`, \`src/lib/palette-url.ts\`, \`src/lib/data/\` — the colour
  engine and the curated palettes shared with the website; imported through
  the \`@/\` alias in \`extensions/browser/vite.config.ts\`.
- \`extensions/browser/src/extract.ts\` → \`scanPage()\` is the only code that runs
  in a web page. It is injected with \`scripting.executeScript\` after the user
  opens the "From page" tab, reads computed CSS colours, and returns them to
  the popup. Nothing is sent anywhere.

Third-party code comes from npm unmodified: react, react-dom, culori,
lucide-react, tailwindcss.
`;
zip.addBuffer(Buffer.from(instructions), 'SOURCE_BUILD.md');

mkdirSync(join(ext, 'release'), { recursive: true });
const out = join(ext, 'release', `cohesive-colors-firefox-${version}-source.zip`);
zip.outputStream.pipe(createWriteStream(out)).on('close', () => console.log(`Wrote ${relative(ext, out)}`));
zip.end();
