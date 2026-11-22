/**
 * Thin promise wrapper over chrome.storage.local, falling back to localStorage
 * when the popup is opened as a plain page (vite preview, tests). Firefox's
 * `browser.storage` is exposed as `chrome.storage` too, so this stays portable.
 */
const hasChromeStorage = () =>
  typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined' && !!chrome.storage.local;

export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    if (hasChromeStorage()) {
      const got = await chrome.storage.local.get(key);
      return (got[key] as T | undefined) ?? fallback;
    }
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function save<T>(key: string, value: T): Promise<void> {
  try {
    if (hasChromeStorage()) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage is best-effort; the popup still works without it */
  }
}
