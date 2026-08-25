/**
 * One-time import of the curated seed feed into Realtime Database.
 *
 * Run this before opening the site against a fresh Firebase project: without
 * it the shared feed is empty, and "Popular" has nothing to rank. The baseline
 * like counts from the seed file are carried over so the tab is meaningful
 * from day one.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *   PUBLIC_FIREBASE_DATABASE_URL=https://…firebasedatabase.app \
 *   node scripts/seed-firebase.mjs [--force]
 *
 * Existing palettes are left alone unless --force is passed, so re-running it
 * never resets like counts people have earned.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './load-env.mjs';
import { flag } from './flags.mjs';

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));
const force = flag('force');

const databaseURL = process.env.PUBLIC_FIREBASE_DATABASE_URL;
if (!databaseURL) {
  console.error(
    'PUBLIC_FIREBASE_DATABASE_URL is not set.\n' +
      'Put it in .env (see .env.example) or pass it as an environment variable.',
  );
  process.exit(1);
}

// Fall back to the conventional filename so the common case needs no env var.
const defaultKey = resolve(here, '../serviceAccountKey.json');
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(defaultKey)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = defaultKey;
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'No service-account key found.\n' +
      'Firebase console > Project settings > Service accounts > Generate new private key,\n' +
      `then save it as ${defaultKey}\n` +
      'or set GOOGLE_APPLICATION_CREDENTIALS to wherever you put it.',
  );
  process.exit(1);
}
if (!existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.error(`Service-account key not found at ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  process.exit(1);
}

const { initializeApp, cert, applicationDefault } = await import('firebase-admin/app');
const { getDatabase } = await import('firebase-admin/database');

const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
initializeApp({
  credential: credentialPath ? cert(JSON.parse(readFileSync(credentialPath, 'utf8'))) : applicationDefault(),
  databaseURL,
});

const db = getDatabase();
const palettes = JSON.parse(readFileSync(resolve(here, '../src/lib/data/palettes.json'), 'utf8'));

const existing = (await db.ref('palettes').get()).val() ?? {};
const patch = {};
let skipped = 0;

for (const p of palettes) {
  if (existing[p.id] && !force) {
    skipped++;
    continue;
  }
  patch[p.id] = {
    name: p.name,
    colors: p.colors,
    raw: p.raw,
    harmony: p.harmony,
    hue: p.hue,
    moods: p.moods,
    seed: p.seed,
    cohesion: p.cohesion,
    createdAt: Date.parse(p.createdAt),
    author: 'seed',
    // Keep whatever the palette has already earned.
    likes: force ? (existing[p.id]?.likes ?? p.likes) : p.likes,
  };
}

if (Object.keys(patch).length) await db.ref('palettes').update(patch);

console.log(`imported ${Object.keys(patch).length} palettes, skipped ${skipped} already present`);
process.exit(0);
