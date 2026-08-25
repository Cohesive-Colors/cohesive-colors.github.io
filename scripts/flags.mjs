/**
 * Reads a flag from any of the places it can end up.
 *
 * `npm run x -- --apply` is not reliable across shells. PowerShell treats `--`
 * as end-of-parameters and drops it, and npm versions differ on whether a
 * leftover `--apply` reaches argv, becomes npm_config_apply, or is swallowed
 * entirely. Running the script directly always works, so that is what the
 * scripts suggest, but all three sources are checked anyway.
 */
const truthy = (v) => v === '' || v === 'true' || v === '1' || v === 'yes';

export function flag(name) {
  if (process.argv.slice(2).includes(`--${name}`)) return true;

  const key = name.replace(/-/g, '_');
  if (truthy(process.env[`npm_config_${key}`])) return true;
  if (truthy(process.env[key.toUpperCase()])) return true;

  // npm exposes the original command line here, which survives when argv does not.
  try {
    const raw = process.env.npm_config_argv;
    if (raw && JSON.parse(raw).original?.includes(`--${name}`)) return true;
  } catch {
    /* not set, or not JSON */
  }
  return false;
}

/** Same idea for a flag that carries a value. */
export function option(name, fallback) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];

  const key = name.replace(/-/g, '_');
  for (const source of [process.env[`npm_config_${key}`], process.env[key.toUpperCase()]]) {
    if (source && !truthy(source)) return source;
  }
  return fallback;
}

/** Shown when a flag was expected but not found, so the cause is visible. */
export function flagHelp(script, name) {
  const seen = process.argv.slice(2);
  return [
    `Run it directly, which works in every shell:`,
    `  node scripts/${script} --${name}`,
    '',
    `(this run saw arguments: ${seen.length ? seen.join(' ') : 'none'})`,
  ].join('\n');
}
