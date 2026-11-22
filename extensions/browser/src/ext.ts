/**
 * The extension APIs under one name. Firefox exposes the promise-based
 * `browser.*` namespace (and a `chrome.*` alias); Chrome and Edge expose only
 * `chrome.*`, which also returns promises under Manifest V3. Prefer `browser`
 * when it exists so Firefox always gets its native API.
 *
 * `null` when the popup is opened as a plain web page (development), so every
 * caller keeps a fallback.
 */
type Api = typeof chrome;

const g = globalThis as unknown as { browser?: Api; chrome?: Api };

export const ext: Api | null =
  g.browser?.runtime?.id ? g.browser : g.chrome?.runtime?.id ? g.chrome : null;
