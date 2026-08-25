/**
 * Loads .env for the standalone scripts.
 *
 * Astro injects PUBLIC_* vars into the app, but plain `node scripts/…` runs get
 * nothing — so every script here reads the file itself. Real environment
 * variables win, which keeps CI and one-off overrides working.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const file = resolve(root, '.env');
  if (!existsSync(file)) return root;

  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith('#')) continue;
    process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, '').trim();
  }
  return root;
}
