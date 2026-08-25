/**
 * Derives every shipped brand asset from src/assets/brand/icon-source.png.
 *
 * The source is a 1254px render with a dark canvas around the tile; everything
 * here starts by cropping to the tile itself, so favicons are not 40% padding.
 *
 * Run with: npm run icons   (requires python3 + Pillow, and ImageMagick for .ico)
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
execFileSync('python3', [resolve(here, 'generate-icons.py')], { stdio: 'inherit' });
