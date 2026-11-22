// Post-build checks: the store rejects a package whose manifest and files
// disagree, and catching it here is cheaper than a review round-trip.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = `${root}dist/chrome/`;
const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
const manifest = JSON.parse(readFileSync(`${dist}manifest.json`, 'utf8'));

// package.json is the single source of the version number.
manifest.version = pkg.version;
writeFileSync(`${dist}manifest.json`, JSON.stringify(manifest, null, 2) + '\n');

const required = [manifest.action.default_popup, ...Object.values(manifest.icons)];
const missing = required.filter((f) => !existsSync(dist + f));
if (missing.length) {
  console.error(`Missing from dist/chrome: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`dist/chrome ready — ${manifest.name} v${manifest.version}`);
