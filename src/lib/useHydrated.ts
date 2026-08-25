import { useEffect, useState } from 'react';

/**
 * Guards anything that depends on localStorage so the first client render
 * matches the server HTML — otherwise liked hearts cause hydration mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
