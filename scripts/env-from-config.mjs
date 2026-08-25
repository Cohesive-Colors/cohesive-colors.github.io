/**
 * Turns a pasted Firebase config into a .env file.
 *
 * Copying five values by hand is where setups break — a truncated databaseURL
 * or a swapped projectId fails much later, as an unrelated-looking network
 * error. This parses whatever the console gives you and writes the file.
 *
 *   node scripts/env-from-config.mjs firebase-config.txt
 *   node scripts/env-from-config.mjs            # then paste, then Ctrl+D
 *
 * Accepts the JS snippet, a bare object, or JSON — anything with the keys in it.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, '.env');

const source = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : readFileSync(0, 'utf8');

/** Pulls `key: "value"` or `"key": "value"` out of whatever was pasted. */
const pick = (key) => {
  const match = source.match(new RegExp(`["']?${key}["']?\\s*[:=]\\s*["']([^"']+)["']`, 'i'));
  return match ? match[1].trim() : '';
};

const values = {
  PUBLIC_FIREBASE_API_KEY: pick('apiKey'),
  PUBLIC_FIREBASE_AUTH_DOMAIN: pick('authDomain'),
  PUBLIC_FIREBASE_DATABASE_URL: pick('databaseURL'),
  PUBLIC_FIREBASE_PROJECT_ID: pick('projectId'),
  PUBLIC_FIREBASE_APP_ID: pick('appId'),
};

const missing = Object.entries(values).filter(([, v]) => !v).map(([k]) => k);

// databaseURL is absent from the snippet unless Realtime Database existed when
// the web app was registered — derive it rather than sending people back.
if (!values.PUBLIC_FIREBASE_DATABASE_URL && values.PUBLIC_FIREBASE_PROJECT_ID) {
  console.log(
    `\nNo databaseURL in that snippet. It is only included once Realtime Database exists.\n` +
      `Copy it from the top of the Realtime Database page, it looks like:\n` +
      `  https://${values.PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.<region>.firebasedatabase.app\n`,
  );
}

if (missing.length === Object.keys(values).length) {
  console.error('\nNothing recognisable in that input, expected a firebaseConfig object.\n');
  process.exit(1);
}

if (existsSync(target)) copyFileSync(target, `${target}.backup`);

const body =
  '# Written by scripts/env-from-config.mjs\n' +
  Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n') +
  '\n\n# Only for scripts/seed-firebase.mjs, path to a service-account JSON\nGOOGLE_APPLICATION_CREDENTIALS=\n';

writeFileSync(target, body);

console.log('\nWrote .env:');
for (const [key, value] of Object.entries(values)) {
  const shown = value ? (key.includes('API_KEY') ? `${value.slice(0, 10)}...` : value) : 'MISSING, fill this in by hand';
  console.log(`  ${key.padEnd(30)} ${shown}`);
}
console.log(existsSync(`${target}.backup`) ? '\nPrevious .env kept as .env.backup' : '');
console.log('Next:  npm run check:firebase\n');
