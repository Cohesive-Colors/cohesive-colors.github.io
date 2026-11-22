import { ext } from './ext';

/**
 * Thin promise wrapper over the extension's local storage (chrome.storage in
 * Chrome/Edge, browser.storage in Firefox), falling back to localStorage when
 * the popup is opened as a plain page (vite preview, tests).
 */
const area = () => ext?.storage?.local ?? null;

export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const store = area();
    if (store) {
      const got = await store.get(key);
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
    const store = area();
    if (store) {
      await store.set({ [key]: value });
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage is best-effort; the popup still works without it */
  }
}
