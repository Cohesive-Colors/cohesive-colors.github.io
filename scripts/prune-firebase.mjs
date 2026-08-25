/**
 * Removes seeded palettes that are no longer part of the curated set.
 *
 * Re-running `npm run seed` regenerates every palette with a new id, so an
 * earlier import leaves orphans behind: they still win in the feed (published
 * palettes take priority over the bundled seed), they have no prebuilt social
 * images, and their links fall back to /palette/view.
 *
 * Only rows written by the importer (author === "seed") whose id is missing
 * from the current palettes.json are touched. Anything a person published is
 * left alone, whatever its id.
 *
 *   node scripts/prune-firebase.mjs            # dry run, lists what it would do
 *   node scripts/prune-firebase.mjs --apply    # actually delete
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './load-env.mjs';
import { flag, flagHelp } from './flags.mjs';

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));
const apply = flag('apply');

const databaseURL = process.env.PUBLIC_FIREBASE_DATABASE_URL;
if (!databaseURL) {
  console.error('PUBLIC_FIREBASE_DATABASE_URL is not set. See .env.example.');
  process.exit(1);
}

const defaultKey = resolve(here, '../serviceAccountKey.json');
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(defaultKey)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = defaultKey;
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(`No service-account key. Save it as ${defaultKey}.`);
  process.exit(1);
}

const { initializeApp, cert } = await import('firebase-admin/app');
const { getDatabase } = await import('firebase-admin/database');

initializeApp({
  credential: cert(JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))),
  databaseURL,
});

const db = getDatabase();
const current = new Set(
  JSON.parse(readFileSync(resolve(here, '../src/lib/data/palettes.json'), 'utf8')).map((p) => p.id),
);

const remote = (await db.ref('palettes').get()).val() ?? {};
const entries = Object.entries(remote);

const stale = entries.filter(([id, p]) => p?.author === 'seed' && !current.has(id));
const userMade = entries.filter(([, p]) => p?.author !== 'seed').length;

// The importer writes a baseline like count with every seeded palette, so a
// large number there means nothing. Only an entry under /userLikes is a like
// somebody actually gave.
const userLikes = (await db.ref('userLikes').get()).val() ?? {};
const realLikes = new Map();
for (const ids of Object.values(userLikes)) {
  for (const id of Object.keys(ids ?? {})) realLikes.set(id, (realLikes.get(id) ?? 0) + 1);
}
const liked = stale.filter(([id]) => (realLikes.get(id) ?? 0) > 0);

console.log(`\n${entries.length} palettes in the database`);
console.log(`  ${entries.length - userMade - stale.length} seeded and still current`);
console.log(`  ${userMade} published by people, never touched`);
console.log(`  ${stale.length} seeded but no longer in palettes.json`);
if (liked.length) {
  console.log(`\n  ${liked.length} of the stale ones have likes and will lose them:`);
  for (const [id, p] of liked.slice(0, 10)) console.log(`    ${p.name} [${id}], ${p.likes} likes`);
  if (liked.length > 10) console.log(`    ...and ${liked.length - 10} more`);
}

if (!stale.length) {
  console.log('\nNothing to prune.\n');
  process.exit(0);
}
if (!apply) {
  console.log(`\nDry run, nothing was deleted.\n${flagHelp('prune-firebase.mjs', 'apply')}\n`);
  process.exit(0);
}

const patch = {};
for (const [id] of stale) patch[id] = null;
await db.ref('palettes').update(patch);

// Their like mirrors would otherwise point at palettes that no longer exist.
const mirrorPatch = {};
for (const [uid, ids] of Object.entries(userLikes)) {
  for (const id of Object.keys(ids ?? {})) {
    if (patch[id] === null) mirrorPatch[`${uid}/${id}`] = null;
  }
}
if (Object.keys(mirrorPatch).length) await db.ref('userLikes').update(mirrorPatch);

console.log(`\nDeleted ${stale.length} stale palettes and ${Object.keys(mirrorPatch).length} orphaned like entries.\n`);
process.exit(0);
