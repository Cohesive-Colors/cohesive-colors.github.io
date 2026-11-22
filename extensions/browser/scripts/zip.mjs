// Packs a built target into the zip its store expects (manifest.json at the
// root of the archive):
//
//   node scripts/zip.mjs chrome   → release/cohesive-colors-chrome-<v>.zip   (Chrome Web Store, Edge Add-ons)
//   node scripts/zip.mjs firefox  → release/cohesive-colors-firefox-<v>.zip  (addons.mozilla.org)
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import yazl from 'yazl';

const target = process.argv[2] ?? 'chrome';
const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist', target);
if (!existsSync(join(dist, 'manifest.json'))) {
  console.error(`dist/${target} is missing — run npm run build:${target} first`);
  process.exit(1);
}
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
mkdirSync(join(root, 'release'), { recursive: true });
const out = join(root, 'release', `cohesive-colors-${target}-${version}.zip`);

const zip = new yazl.ZipFile();
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else zip.addFile(full, relative(dist, full).split('\\').join('/'));
  }
};
walk(dist);
zip.outputStream.pipe(createWriteStream(out)).on('close', () => console.log(`Wrote ${relative(root, out)}`));
zip.end();
