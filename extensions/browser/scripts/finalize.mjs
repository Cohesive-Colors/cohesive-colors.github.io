// Post-build step for one target: writes the version and the browser-specific
// manifest keys, then checks that every file the manifest names exists. The
// stores reject a package whose manifest and files disagree, and catching it
// here is cheaper than a review round-trip.
//
//   node scripts/finalize.mjs chrome
//   node scripts/finalize.mjs firefox
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = process.argv[2] ?? 'chrome';
if (!['chrome', 'firefox'].includes(target)) {
  console.error(`Unknown target "${target}" (expected chrome or firefox)`);
  process.exit(1);
}

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = `${root}dist/${target}/`;
const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
const manifest = JSON.parse(readFileSync(`${dist}manifest.json`, 'utf8'));

// package.json is the single source of the version number.
manifest.version = pkg.version;

if (target === 'firefox') {
  manifest.browser_specific_settings = {
    gecko: {
      // Permanent: AMO ties the listing and every future update to this id.
      id: 'cohesive-colors@cohesive-colors.github.io',
      // 140 is the first release with the built-in data-consent screen, so
      // `data_collection_permissions` needs no consent UI of our own.
      strict_min_version: '140.0',
      // Required for every new AMO submission since November 2025. The
      // extension collects and transmits nothing.
      data_collection_permissions: { required: ['none'] },
    },
  };
}

writeFileSync(`${dist}manifest.json`, JSON.stringify(manifest, null, 2) + '\n');

const required = [manifest.action.default_popup, ...Object.values(manifest.icons)];
const missing = required.filter((f) => !existsSync(dist + f));
if (missing.length) {
  console.error(`Missing from dist/${target}: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`dist/${target} ready — ${manifest.name} v${manifest.version}`);
