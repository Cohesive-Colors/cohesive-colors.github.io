/**
 * Verifies a Firebase setup end to end: config, anonymous sign-in, public read,
 * and — most importantly — that the security rules actually hold.
 *
 *   npm run check:firebase
 *
 * Reads .env from the project root. Every counter test is net-zero: it likes a
 * palette and unlikes it again, so running this against production is safe.
 */
import { loadEnv } from './load-env.mjs';

loadEnv();

const config = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID,
};

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const OFF = '\x1b[0m';

let failures = 0;
let skipped = 0;
const pass = (msg) => console.log(`  ${GREEN}ok${OFF}    ${msg}`);
const fail = (msg, detail) => {
  failures++;
  console.log(`  ${RED}FAIL${OFF}  ${msg}${detail ? `\n        ${detail}` : ''}`);
};

/** Asserts that a write is rejected by the rules. */
async function mustReject(label, action) {
  try {
    await action();
    fail(label, 'the write SUCCEEDED, your rules are more permissive than they should be');
  } catch (error) {
    if (String(error).includes('PERMISSION_DENIED')) pass(label);
    else fail(label, `rejected, but not by the rules: ${error}`);
  }
}

async function mustAllow(label, action) {
  try {
    await action();
    pass(label);
  } catch (error) {
    fail(label, String(error));
  }
}

// Values copied straight out of .env.example are the most common failure —
// they are "set", so a bare emptiness check waves them through and the error
// only surfaces later as a confusing network failure.
const PLACEHOLDER = /your-project|your_project|xxx|<.*>|CHANGE_?ME/i;

console.log('\nConfiguration');
for (const [key, value] of Object.entries(config)) {
  if (!value) fail(`${key} is missing`, 'add it to .env, see .env.example');
  else if (PLACEHOLDER.test(value)) {
    fail(`${key} is still the template value`, `got "${value}", replace it with the real one from the Firebase console`);
  } else pass(`${key} is set`);
}
if (config.databaseURL && !/firebasedatabase\.app|firebaseio\.com/.test(config.databaseURL)) {
  fail('databaseURL looks wrong', `expected an https://...firebasedatabase.app URL, got ${config.databaseURL}`);
}
if (failures) {
  console.log(
    '\nStopping: fix the configuration first.\n' +
      'Fastest way, copy the firebaseConfig snippet from\n' +
      '  Project settings > Your apps > SDK setup and configuration > Config\n' +
      'into a file and run:  node scripts/env-from-config.mjs <file>\n',
  );
  process.exit(1);
}

const { initializeApp, deleteApp } = await import('firebase/app');
const { getAuth, signInAnonymously } = await import('firebase/auth');
const { getDatabase, ref, get, child, set, update, increment, query, limitToFirst, goOffline } =
  await import('firebase/database');

/**
 * Closes the SDK's sockets before exiting. Without this, Node on Windows aborts
 * with "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" — alarming
 * noise that has nothing to do with the checks.
 */
async function finish(code) {
  try {
    goOffline(db);
    await deleteApp(app);
  } catch {
    /* shutting down anyway */
  }
  process.exit(code);
}

const app = initializeApp(config);
const db = getDatabase(app);
const dbRoot = ref(db);

console.log('\nAuthentication');
let uid;
try {
  uid = (await signInAnonymously(getAuth(app))).user.uid;
  pass(`anonymous sign-in works (uid ${uid.slice(0, 8)}...)`);
} catch (error) {
  const code = String(error);
  const hint = code.includes('admin-restricted-operation') || code.includes('operation-not-allowed')
    ? 'The Anonymous provider is OFF. Firebase console > Authentication > Sign-in method >\n' +
      '        click "Anonymous" in the Native providers column > toggle Enable > Save.\n' +
      '        Direct link: https://console.firebase.google.com/project/_/authentication/providers'
    : code.includes('network-request-failed')
      ? 'No network, or the project/databaseURL does not exist. Check PUBLIC_FIREBASE_DATABASE_URL.'
      : code.includes('api-key-not-valid')
        ? 'PUBLIC_FIREBASE_API_KEY is wrong, copy it again from Project settings > Your apps.'
        : 'Check the API key and that this project has Authentication enabled.';
  fail('anonymous sign-in', `${error}\n        ${hint}`);
  console.log('\nStopping: nothing else can be tested without a signed-in user.\n');
  await finish(1);
}

console.log('\nReading the feed');
let sampleId = null;
try {
  const snap = await get(query(child(dbRoot, 'palettes'), limitToFirst(1)));
  if (snap.exists()) {
    sampleId = Object.keys(snap.val())[0];
    pass(`/palettes is publicly readable (found "${sampleId}")`);
  } else {
    pass('/palettes is readable but empty');
    console.log('        Run `npm run seed:firebase` to import the curated feed.');
  }
} catch (error) {
  fail('/palettes read', `${error}\n        Deploy the rules: npm run rules:deploy`);
}

console.log('\nSecurity rules');
const fakeId = `__rulecheck_${Date.now()}`;

await mustReject('a palette cannot be created with a made-up like count', () =>
  set(child(dbRoot, `palettes/${fakeId}/likes`), 999),
);

await mustReject("another user's likes cannot be written", () =>
  set(child(dbRoot, `userLikes/not-${uid}/${fakeId}`), true),
);

if (sampleId) {
  const startingCount = (await get(child(dbRoot, `palettes/${sampleId}/likes`))).val() ?? 0;

  await mustReject('the like counter cannot be bumped without recording the like', () =>
    update(dbRoot, { [`palettes/${sampleId}/likes`]: increment(1) }),
  );

  await mustReject('the like counter cannot jump by more than one', () =>
    update(dbRoot, {
      [`palettes/${sampleId}/likes`]: increment(5),
      [`userLikes/${uid}/${sampleId}`]: true,
    }),
  );

  await mustAllow('a genuine like is accepted', () =>
    update(dbRoot, {
      [`palettes/${sampleId}/likes`]: increment(1),
      [`userLikes/${uid}/${sampleId}`]: true,
    }),
  );

  await mustReject('the same user cannot like twice', () =>
    update(dbRoot, {
      [`palettes/${sampleId}/likes`]: increment(1),
      [`userLikes/${uid}/${sampleId}`]: true,
    }),
  );

  await mustReject('the like mirror cannot be dropped on its own', () =>
    update(dbRoot, { [`userLikes/${uid}/${sampleId}`]: null }),
  );

  await mustAllow('un-liking is accepted (restoring the original count)', () =>
    update(dbRoot, {
      [`palettes/${sampleId}/likes`]: increment(-1),
      [`userLikes/${uid}/${sampleId}`]: null,
    }),
  );

  await mustReject('a like mirror cannot be added without moving the counter', () =>
    update(dbRoot, { [`userLikes/${uid}/${sampleId}`]: true }),
  );

  // The count must be exactly where it started: every accepted write above was
  // matched by its inverse, and every rejected one changed nothing.
  const finalCount = (await get(child(dbRoot, `palettes/${sampleId}/likes`))).val() ?? 0;
  if (finalCount === startingCount) pass(`the like count is back where it started (${finalCount})`);
  else fail('the like count drifted', `started at ${startingCount}, ended at ${finalCount}`);
} else {
  skipped = 7;
  console.log('  skip  counter tests need at least one palette, run `npm run seed:firebase` first');
}

// Saying "all passed" while the counter rules were never exercised would be
// the most misleading line this script could print.
console.log(
  failures
    ? `\n${RED}${failures} check(s) failed.${OFF} Fix these before shipping, the counter may be writable by anyone.\n`
    : skipped
      ? `\n${GREEN}Config, auth and read access are correct${OFF}, but ${skipped} counter checks were skipped\n` +
        `because the database is empty, including the two that matter most:\n` +
        `  · the same user cannot like twice\n` +
        `  · the counter cannot move without recording the like\n` +
        `Import the feed (npm run seed:firebase) and run this again to cover them.\n`
      : `\n${GREEN}All checks passed.${OFF} Shared likes are wired up correctly.\n`,
);
await finish(failures ? 1 : 0);
