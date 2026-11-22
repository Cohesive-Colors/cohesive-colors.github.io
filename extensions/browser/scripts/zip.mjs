// Packs dist/chrome into the zip the Chrome Web Store upload form expects
// (manifest.json at the root of the archive).
import { createWriteStream, readdirSync, readFileSync, statSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import yazl from 'yazl';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist', 'chrome');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
mkdirSync(join(root, 'release'), { recursive: true });
const out = join(root, 'release', `cohesive-colors-chrome-${version}.zip`);

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
